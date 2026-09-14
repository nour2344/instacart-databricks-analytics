import json
import logging
import os
from collections import defaultdict
from threading import Lock
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.database import get_connection
from api.repository import (
    get_customer_favorite_departments,
    get_customer_intelligence_overview,
    get_customer_persona_distribution,
    get_customer_recommendations,
    get_customer_reorder_planner,
    get_customer_shopping_dna,
    get_customers,
    get_next_basket_predictions,
    get_recommendation_departments,
    get_recommendation_intelligence_overview,
    get_recommendation_rank_performance,
    get_recommendation_source_mix,
    get_retail_departments,
    get_retail_overview,
    get_retail_product,
    get_retail_product_segments,
    get_retail_top_products,
)


# ============================================================
# Logging
# ============================================================

logger = logging.getLogger("retail_intelligence_api")

if not logger.handlers:
    handler = logging.StreamHandler()

    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s | %(levelname)s | %(message)s"
        )
    )

    logger.addHandler(handler)

logger.setLevel(logging.INFO)


# ============================================================
# Lightweight in-memory application metrics
# ============================================================

metrics_lock = Lock()

metrics = {
    "total_requests": 0,
    "total_errors": 0,
    "total_latency_ms": 0.0,
    "status_codes": defaultdict(int),
    "endpoints": defaultdict(
        lambda: {
            "requests": 0,
            "errors": 0,
            "total_latency_ms": 0.0,
        }
    ),
}


def record_request_metric(
    path: str,
    status_code: int,
    duration_ms: float,
):
    """
    Record process-level API metrics.

    The route template is used when possible so requests such as
    /api/customers/21/... and /api/customers/22/... are aggregated
    under the same endpoint rather than creating high-cardinality
    metric keys.
    """

    with metrics_lock:
        metrics["total_requests"] += 1
        metrics["total_latency_ms"] += duration_ms

        metrics["status_codes"][
            str(status_code)
        ] += 1

        endpoint = metrics["endpoints"][path]

        endpoint["requests"] += 1
        endpoint["total_latency_ms"] += duration_ms

        if status_code >= 400:
            metrics["total_errors"] += 1
            endpoint["errors"] += 1


# ============================================================
# FastAPI application
# ============================================================

app = FastAPI(
    title="Instacart Retail Intelligence Platform API",
    description=(
        "Serving layer for an end-to-end retail intelligence platform "
        "built from Databricks Gold analytics, next-basket ML predictions, "
        "recommendation intelligence, reorder-cycle signals, Customer "
        "Shopping DNA, Neon PostgreSQL, and FastAPI."
    ),
    version="2.0.0",
)


# ============================================================
# CORS
# ============================================================

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

extra_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "",
    ).split(",")
    if origin.strip()
]

allowed_origins = list(
    dict.fromkeys(
        default_origins
        + extra_origins
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    expose_headers=["X-Request-ID"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Request observability
# ============================================================

@app.middleware("http")
async def request_observability(
    request: Request,
    call_next,
):
    """
    Add a request ID, structured logs, latency tracking,
    status tracking, and endpoint-level metrics to every request.
    """

    request_id = str(uuid4())
    start_time = perf_counter()
    status_code = 500

    try:
        response = await call_next(request)

        status_code = response.status_code

        response.headers[
            "X-Request-ID"
        ] = request_id

        return response

    except Exception:
        logger.exception(
            json.dumps(
                {
                    "event": "request_failed",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                }
            )
        )

        raise

    finally:
        duration_ms = round(
            (
                perf_counter()
                - start_time
            )
            * 1000,
            2,
        )

        route = request.scope.get("route")

        metric_path = (
            getattr(
                route,
                "path",
                request.url.path,
            )
            if route is not None
            else request.url.path
        )

        record_request_metric(
            path=metric_path,
            status_code=status_code,
            duration_ms=duration_ms,
        )

        log_payload = {
            "event": "http_request",
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "route": metric_path,
            "status_code": status_code,
            "duration_ms": duration_ms,
        }

        if status_code >= 500:
            logger.error(
                json.dumps(log_payload)
            )

        elif status_code >= 400:
            logger.warning(
                json.dumps(log_payload)
            )

        else:
            logger.info(
                json.dumps(log_payload)
            )


# ============================================================
# Serialization helpers
# ============================================================

def _to_int(value):
    if value is None:
        return None

    return int(value)


def _to_float(
    value,
    digits: int | None = None,
):
    if value is None:
        return None

    result = float(value)

    if digits is None:
        return result

    return round(
        result,
        digits,
    )


def _percentage_from_probability(
    value,
    digits: int = 1,
):
    if value is None:
        return None

    return round(
        float(value)
        * 100,
        digits,
    )


# ============================================================
# Customer response builders
# ============================================================

def _build_next_basket_response(
    user_id: int,
    predictions,
):
    if not predictions:
        raise HTTPException(
            status_code=404,
            detail=(
                "No next-basket predictions found "
                f"for customer {user_id}"
            ),
        )

    predicted_products = []

    for prediction in predictions:
        probability = _to_float(
            prediction[
                "purchase_probability"
            ],
            4,
        )

        probability_pct = prediction.get(
            "predicted_probability_pct"
        )

        if probability_pct is None:
            probability_pct = (
                _percentage_from_probability(
                    probability,
                    1,
                )
            )

        else:
            probability_pct = _to_float(
                probability_pct,
                1,
            )

        predicted_products.append(
            {
                "rank": prediction[
                    "prediction_rank"
                ],
                "product_id": prediction[
                    "product_id"
                ],
                "product_name": prediction[
                    "product_name"
                ],
                "aisle": prediction[
                    "aisle"
                ],
                "department": prediction[
                    "department"
                ],
                "purchase_probability":
                    probability,
                "predicted_probability_pct":
                    probability_pct,
                "prediction_type": prediction[
                    "prediction_type"
                ],
                "is_new_to_customer": bool(
                    prediction[
                        "is_new_to_customer"
                    ]
                ),
                "candidate_source": prediction[
                    "candidate_source"
                ],
            }
        )

    return {
        "user_id": user_id,
        "target_order_id": predictions[0][
            "target_order_id"
        ],
        "total_predictions": len(
            predictions
        ),
        "model_output":
            "next_basket_prediction",
        "predictions":
            predicted_products,
    }


def _build_reorder_response(
    user_id: int,
    items,
):
    if not items:
        raise HTTPException(
            status_code=404,
            detail=(
                "No reorder-cycle data found "
                f"for customer {user_id}"
            ),
        )

    sections = {
        "overdue": [],
        "due_now": [],
        "due_soon": [],
        "early": [],
        "no_established_cycle": [],
        "other": [],
    }

    status_mapping = {
        "OVERDUE": "overdue",
        "DUE_NOW": "due_now",
        "DUE_SOON": "due_soon",
        "EARLY": "early",
        "NO_ESTABLISHED_CYCLE":
            "no_established_cycle",
    }

    for item in items:
        status = item[
            "reorder_status"
        ]

        section = status_mapping.get(
            status,
            "other",
        )

        avg_gap = item[
            "user_product_avg_order_gap"
        ]

        reorder_rate = item[
            "user_product_reorder_rate"
        ]

        due_score = item[
            "user_product_due_score"
        ]

        sections[section].append(
            {
                "product_id":
                    item["product_id"],
                "rank":
                    item["recommendation_rank"],
                "product_name":
                    item["product_name"],
                "aisle":
                    item["aisle"],
                "department":
                    item["department"],
                "purchase_probability":
                    _to_float(
                        item[
                            "purchase_probability"
                        ],
                        4,
                    ),
                "purchase_probability_pct":
                    _percentage_from_probability(
                        item[
                            "purchase_probability"
                        ],
                        1,
                    ),
                "reorder_status":
                    status,
                "orders_since_last_purchase":
                    item[
                        "orders_since_last_product_purchase"
                    ],
                "usual_order_gap":
                    _to_float(
                        avg_gap,
                        1,
                    ),
                "due_score":
                    _to_float(
                        due_score,
                        2,
                    ),
                "historical_reorder_rate_pct":
                    _percentage_from_probability(
                        reorder_rate,
                        1,
                    ),
                "action":
                    item["client_action"],
                "why":
                    item["why_recommended"],
            }
        )

    counts = {
        name: len(values)
        for name, values
        in sections.items()
    }

    attention_count = (
        counts["overdue"]
        + counts["due_now"]
    )

    upcoming_count = counts[
        "due_soon"
    ]

    if attention_count > 0:
        planner_summary = (
            f"{attention_count} "
            f"{'product needs' if attention_count == 1 else 'products need'} "
            "attention based on the customer's observed reorder cycle."
        )

    elif upcoming_count > 0:
        planner_summary = (
            f"{upcoming_count} "
            f"{'product is' if upcoming_count == 1 else 'products are'} "
            "approaching the customer's usual reorder window."
        )

    else:
        planner_summary = (
            "No surfaced reorder product is "
            "urgently due for this customer."
        )

    return {
        "user_id":
            user_id,
        "target_order_id":
            items[0]["target_order_id"],
        "total_reorder_products":
            len(items),
        "attention_count":
            attention_count,
        "upcoming_count":
            upcoming_count,
        "planner_summary":
            planner_summary,
        "status_counts":
            counts,
        "sections":
            sections,
    }


def _build_recommendation_response(
    user_id: int,
    recommendations,
):
    if not recommendations:
        raise HTTPException(
            status_code=404,
            detail=(
                "No recommendations found "
                f"for customer {user_id}"
            ),
        )

    sections = {
        "reorder_now": [],
        "coming_up": [],
        "favorites_for_later": [],
        "discover": [],
        "other_recommendations": [],
    }

    section_mapping = {
        "REORDER_NOW":
            "reorder_now",
        "COMING_UP":
            "coming_up",
        "FAVORITES_FOR_LATER":
            "favorites_for_later",
        "DISCOVER":
            "discover",
        "OTHER_RECOMMENDATIONS":
            "other_recommendations",
    }

    for recommendation in recommendations:
        section = section_mapping.get(
            recommendation[
                "shopping_section"
            ],
            "other_recommendations",
        )

        sections[section].append(
            {
                "product_id":
                    recommendation[
                        "product_id"
                    ],
                "rank":
                    recommendation[
                        "recommendation_rank"
                    ],
                "product_name":
                    recommendation[
                        "product_name"
                    ],
                "aisle":
                    recommendation[
                        "aisle"
                    ],
                "department":
                    recommendation[
                        "department"
                    ],
                "purchase_probability":
                    _to_float(
                        recommendation[
                            "purchase_probability"
                        ],
                        4,
                    ),
                "purchase_probability_pct":
                    _percentage_from_probability(
                        recommendation[
                            "purchase_probability"
                        ],
                        1,
                    ),
                "recommendation_type":
                    recommendation[
                        "recommendation_type"
                    ],
                "reorder_status":
                    recommendation[
                        "reorder_status"
                    ],
                "candidate_source":
                    recommendation[
                        "candidate_source"
                    ],
                "action":
                    recommendation[
                        "client_action"
                    ],
                "why_recommended":
                    recommendation[
                        "why_recommended"
                    ],
            }
        )

    section_counts = {
        name: len(values)
        for name, values
        in sections.items()
    }

    summary_parts = []

    if section_counts["reorder_now"]:
        summary_parts.append(
            f"{section_counts['reorder_now']} "
            "high-priority reorder signal(s)"
        )

    if section_counts["coming_up"]:
        summary_parts.append(
            f"{section_counts['coming_up']} "
            "upcoming reorder signal(s)"
        )

    if section_counts[
        "favorites_for_later"
    ]:
        summary_parts.append(
            f"{section_counts['favorites_for_later']} "
            "favorite-product opportunity/opportunities"
        )

    if section_counts["discover"]:
        summary_parts.append(
            f"{section_counts['discover']} "
            "discovery opportunity/opportunities"
        )

    recommendation_summary = (
        ". ".join(summary_parts)
        + "."
        if summary_parts
        else (
            "Served recommendation intelligence "
            "is available for this customer."
        )
    )

    return {
        "user_id":
            user_id,
        "target_order_id":
            recommendations[0][
                "target_order_id"
            ],
        "total_recommendations":
            len(recommendations),
        "recommendation_summary":
            recommendation_summary,
        # Backward-compatible key retained for the
        # previously built frontend.
        "shopping_summary":
            recommendation_summary,
        "section_counts":
            section_counts,
        "sections":
            sections,
    }


def _build_dna_response(
    user_id: int,
    dna,
):
    if not dna:
        raise HTTPException(
            status_code=404,
            detail=(
                "No Shopping DNA profile found "
                f"for customer {user_id}"
            ),
        )

    return {
        "user_id":
            dna["user_id"],

        "profile": {
            "persona":
                dna["shopping_persona"],
            "headline":
                dna["dna_headline"],
            "dna_code":
                dna["shopping_dna_code"],
            "dominant_trait":
                dna["dominant_dna_trait"],
            "dominant_score":
                _to_float(
                    dna[
                        "dominant_dna_score"
                    ],
                    1,
                ),
        },

        "summary":
            dna["shopping_dna_summary"],

        "persona_description":
            dna[
                "persona_description"
            ],

        "fingerprint": {
            "loyalty":
                _to_float(
                    dna["loyalty_score"],
                    1,
                ),
            "exploration":
                _to_float(
                    dna[
                        "exploration_score"
                    ],
                    1,
                ),
            "routine":
                _to_float(
                    dna["routine_score"],
                    1,
                ),
            "basket_intensity":
                _to_float(
                    dna[
                        "basket_intensity_score"
                    ],
                    1,
                ),
            "category_focus":
                _to_float(
                    dna[
                        "category_concentration_score"
                    ],
                    1,
                ),
        },

        "shopping_rhythm": {
            "frequency":
                dna[
                    "shopping_frequency"
                ],
            "regularity":
                dna[
                    "shopping_regularity"
                ],
            "basket_momentum":
                dna[
                    "basket_momentum"
                ],
            "avg_basket_size":
                _to_float(
                    dna[
                        "avg_basket_size"
                    ],
                    1,
                ),
            "avg_days_between_orders":
                _to_float(
                    dna[
                        "avg_days_between_orders"
                    ],
                    1,
                ),
            "preferred_hour":
                dna[
                    "preferred_hour"
                ],
            "preferred_hour_label":
                dna[
                    "preferred_hour_label"
                ],
            "preferred_time_period":
                dna[
                    "preferred_time_period"
                ],
        },

        "history": {
            "prior_orders":
                dna[
                    "customer_prior_orders"
                ],
            "unique_products":
                dna[
                    "customer_unique_products"
                ],
            "loyalty_profile":
                dna[
                    "loyalty_profile"
                ],
        },

        "category_signature": {
            "departments": [
                {
                    "rank": 1,
                    "name":
                        dna[
                            "favorite_department"
                        ],
                    "affinity_pct":
                        _to_float(
                            dna[
                                "favorite_department_affinity_pct"
                            ],
                            1,
                        ),
                },
                {
                    "rank": 2,
                    "name":
                        dna[
                            "second_department"
                        ],
                    "affinity_pct":
                        _to_float(
                            dna[
                                "second_department_affinity_pct"
                            ],
                            1,
                        ),
                },
                {
                    "rank": 3,
                    "name":
                        dna[
                            "third_department"
                        ],
                    "affinity_pct":
                        _to_float(
                            dna[
                                "third_department_affinity_pct"
                            ],
                            1,
                        ),
                },
            ],

            "aisles": [
                {
                    "rank": 1,
                    "name":
                        dna[
                            "favorite_aisle"
                        ],
                    "affinity_pct":
                        _to_float(
                            dna[
                                "favorite_aisle_affinity_pct"
                            ],
                            1,
                        ),
                },
                {
                    "rank": 2,
                    "name":
                        dna[
                            "second_aisle"
                        ],
                    "affinity_pct":
                        _to_float(
                            dna[
                                "second_aisle_affinity_pct"
                            ],
                            1,
                        ),
                },
                {
                    "rank": 3,
                    "name":
                        dna[
                            "third_aisle"
                        ],
                    "affinity_pct":
                        _to_float(
                            dna[
                                "third_aisle_affinity_pct"
                            ],
                            1,
                        ),
                },
            ],
        },

        "insights": {
            "loyalty":
                dna[
                    "loyalty_insight"
                ],
            "frequency":
                dna[
                    "frequency_insight"
                ],
            "basket":
                dna[
                    "basket_insight"
                ],
            "category":
                dna[
                    "category_insight"
                ],
            "time":
                dna[
                    "time_insight"
                ],
            "dominant_trait":
                dna[
                    "dominant_trait_insight"
                ],
        },
    }


# ============================================================
# Root
# ============================================================

@app.get(
    "/",
    tags=["Platform"],
)
def root():
    return {
        "service":
            "Instacart Retail Intelligence Platform API",
        "status":
            "running",
        "version":
            "2.0.0",

        "capabilities": {
            "retail_intelligence": [
                "executive_overview",
                "product_intelligence",
                "portfolio_segmentation",
                "department_intelligence",
            ],

            "recommendation_intelligence": [
                "recommendation_kpis",
                "candidate_source_mix",
                "probability_by_rank",
                "recommended_departments",
                "next_basket_prediction",
            ],

            "customer_intelligence": [
                "customer_360",
                "reorder_cycle_intelligence",
                "shopping_dna",
                "behavioral_insights",
            ],

            "platform": [
                "health",
                "readiness",
                "request_observability",
                "application_metrics",
            ],
        },

        "endpoints": {
            "docs":
                "/docs",
            "health":
                "/health",
            "readiness":
                "/ready",
            "metrics":
                "/metrics",
            "retail_overview":
                "/api/retail/overview",
            "recommendation_overview":
                "/api/recommendations/overview",
            "customer_intelligence_overview":
                "/api/customer-intelligence/overview",
        },
    }


# ============================================================
# Liveness
# ============================================================

@app.get(
    "/health",
    tags=["Platform"],
)
def health():
    """
    Verify that the FastAPI process is alive.

    This endpoint intentionally does not depend on Neon.
    """

    return {
        "status":
            "healthy",
        "service":
            "retail-intelligence-api",
    }


# ============================================================
# Readiness
# ============================================================

@app.get(
    "/ready",
    tags=["Platform"],
)
def readiness():
    """
    Verify that both the API and Neon PostgreSQL are ready.
    """

    start_time = perf_counter()

    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1;"
                )

                result = cursor.fetchone()

        database_latency_ms = round(
            (
                perf_counter()
                - start_time
            )
            * 1000,
            2,
        )

        if result != (1,):
            raise RuntimeError(
                "Unexpected database readiness result."
            )

        return {
            "status":
                "ready",

            "database": {
                "provider":
                    "neon-postgresql",
                "status":
                    "connected",
                "latency_ms":
                    database_latency_ms,
            },
        }

    except Exception:
        database_latency_ms = round(
            (
                perf_counter()
                - start_time
            )
            * 1000,
            2,
        )

        logger.exception(
            json.dumps(
                {
                    "event":
                        "readiness_failed",
                    "database":
                        "neon",
                    "latency_ms":
                        database_latency_ms,
                }
            )
        )

        return JSONResponse(
            status_code=503,
            content={
                "status":
                    "not_ready",

                "database": {
                    "provider":
                        "neon-postgresql",
                    "status":
                        "disconnected",
                    "latency_ms":
                        database_latency_ms,
                },
            },
        )


# ============================================================
# Application metrics
# ============================================================

@app.get(
    "/metrics",
    tags=["Platform"],
)
def application_metrics():
    """
    Return process-level API observability metrics.
    """

    with metrics_lock:
        total_requests = metrics[
            "total_requests"
        ]

        average_latency_ms = (
            round(
                metrics[
                    "total_latency_ms"
                ]
                / total_requests,
                2,
            )
            if total_requests > 0
            else 0.0
        )

        endpoint_metrics = {}

        for path, values in metrics[
            "endpoints"
        ].items():

            requests = values[
                "requests"
            ]

            endpoint_metrics[path] = {
                "requests":
                    requests,

                "errors":
                    values[
                        "errors"
                    ],

                "error_rate_pct": (
                    round(
                        values[
                            "errors"
                        ]
                        / requests
                        * 100,
                        2,
                    )
                    if requests > 0
                    else 0.0
                ),

                "average_latency_ms": (
                    round(
                        values[
                            "total_latency_ms"
                        ]
                        / requests,
                        2,
                    )
                    if requests > 0
                    else 0.0
                ),
            }

        return {
            "service":
                "retail-intelligence-api",

            "total_requests":
                total_requests,

            "total_errors":
                metrics[
                    "total_errors"
                ],

            "error_rate_pct": (
                round(
                    metrics[
                        "total_errors"
                    ]
                    / total_requests
                    * 100,
                    2,
                )
                if total_requests > 0
                else 0.0
            ),

            "average_latency_ms":
                average_latency_ms,

            "status_codes":
                dict(
                    metrics[
                        "status_codes"
                    ]
                ),

            "endpoints":
                endpoint_metrics,
        }


# ============================================================
# RETAIL INTELLIGENCE
# ============================================================


@app.get(
    "/api/retail/overview",
    tags=["Retail Intelligence"],
)
def retail_overview():
    """
    Executive assortment and demand KPIs.
    """

    data = get_retail_overview()

    if not data:
        raise HTTPException(
            status_code=404,
            detail=(
                "Retail intelligence data is not available."
            ),
        )

    return {
        "products_analyzed":
            _to_int(
                data[
                    "products_analyzed"
                ]
            ),

        "departments_analyzed":
            _to_int(
                data[
                    "departments_analyzed"
                ]
            ),

        "total_purchase_events":
            _to_int(
                data[
                    "total_purchase_events"
                ]
            ),

        "core_staples":
            _to_int(
                data[
                    "core_staples"
                ]
            ),

        "core_staple_repeat_rate_pct":
            _to_float(
                data[
                    "core_staple_repeat_rate_pct"
                ],
                1,
            ),

        "highest_customer_reach_pct":
            _to_float(
                data[
                    "highest_customer_reach_pct"
                ],
                1,
            ),

        "top_product": {
            "name":
                data[
                    "top_product"
                ],

            "purchase_count":
                _to_int(
                    data[
                        "top_product_purchase_count"
                    ]
                ),
        },

        "top_department": {
            "name":
                data[
                    "top_department"
                ],

            "purchase_count":
                _to_int(
                    data[
                        "top_department_purchase_count"
                    ]
                ),
        },
    }


@app.get(
    "/api/retail/products/top",
    tags=["Retail Intelligence"],
)
def retail_top_products(
    limit: int = Query(
        default=10,
        ge=1,
        le=100,
    ),
    department: str | None = Query(
        default=None,
        min_length=1,
        max_length=100,
    ),
):
    """
    Highest-volume products across the assortment or
    within a selected department.
    """

    rows = get_retail_top_products(
        limit=limit,
        department=department,
    )

    products = []

    for row in rows:
        products.append(
            {
                "product_id":
                    row["product_id"],
                "product_name":
                    row["product_name"],
                "department":
                    row["department"],
                "total_purchase_count":
                    _to_int(
                        row[
                            "total_purchase_count"
                        ]
                    ),
                "unique_customer_count":
                    _to_int(
                        row[
                            "unique_customer_count"
                        ]
                    ),
                "customer_penetration_pct":
                    _to_float(
                        row[
                            "customer_penetration_pct"
                        ],
                        2,
                    ),
                "product_reorder_rate_pct":
                    _percentage_from_probability(
                        row[
                            "product_reorder_rate"
                        ],
                        1,
                    ),
                "purchases_per_customer":
                    _to_float(
                        row[
                            "purchases_per_customer"
                        ],
                        2,
                    ),
                "purchase_rank":
                    row[
                        "purchase_rank"
                    ],
                "department_purchase_rank":
                    row[
                        "department_purchase_rank"
                    ],
                "demand_tier":
                    row[
                        "demand_tier"
                    ],
                "repeat_behavior_tier":
                    row[
                        "repeat_behavior_tier"
                    ],
                "metric_reliability":
                    row[
                        "metric_reliability"
                    ],
                "product_segment":
                    row[
                        "product_segment"
                    ],
                "business_focus":
                    row[
                        "business_focus"
                    ],
            }
        )

    return {
        "count":
            len(products),
        "department_filter":
            department,
        "products":
            products,
    }


@app.get(
    "/api/retail/products/segments",
    tags=["Retail Intelligence"],
)
def retail_product_segments():
    """
    Product-portfolio segmentation and business focus.
    """

    rows = get_retail_product_segments()

    segments = []

    for row in rows:
        segments.append(
            {
                "product_segment":
                    row[
                        "product_segment"
                    ],
                "product_count":
                    _to_int(
                        row[
                            "product_count"
                        ]
                    ),
                "avg_purchases_per_product":
                    _to_float(
                        row[
                            "avg_purchases_per_product"
                        ],
                        2,
                    ),
                "avg_reorder_rate_pct":
                    _to_float(
                        row[
                            "avg_reorder_rate_pct"
                        ],
                        1,
                    ),
                "avg_customer_reach_pct":
                    _to_float(
                        row[
                            "avg_customer_reach_pct"
                        ],
                        2,
                    ),
                "business_focus":
                    row[
                        "business_focus"
                    ],
            }
        )

    return {
        "count":
            len(segments),
        "segments":
            segments,
    }


@app.get(
    "/api/retail/departments",
    tags=["Retail Intelligence"],
)
def retail_departments(
    limit: int = Query(
        default=10,
        ge=1,
        le=50,
    ),
):
    """
    Department-level demand and repeat-purchase metrics.
    """

    rows = get_retail_departments(
        limit=limit
    )

    departments = []

    for row in rows:
        departments.append(
            {
                "department":
                    row[
                        "department"
                    ],
                "product_count":
                    _to_int(
                        row[
                            "product_count"
                        ]
                    ),
                "total_purchase_count":
                    _to_int(
                        row[
                            "total_purchase_count"
                        ]
                    ),
                "avg_reorder_rate_pct":
                    _to_float(
                        row[
                            "avg_reorder_rate_pct"
                        ],
                        1,
                    ),
                "avg_customer_reach_pct":
                    _to_float(
                        row[
                            "avg_customer_reach_pct"
                        ],
                        2,
                    ),
            }
        )

    return {
        "count":
            len(departments),
        "departments":
            departments,
    }


@app.get(
    "/api/retail/products/{product_id}",
    tags=["Retail Intelligence"],
)
def retail_product_detail(
    product_id: int,
):
    """
    Full Retail Gold profile for one product.
    """

    row = get_retail_product(
        product_id
    )

    if not row:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Product {product_id} was not found."
            ),
        )

    return {
        "product_id":
            row["product_id"],
        "product_name":
            row["product_name"],
        "department":
            row["department"],
        "total_purchase_count":
            _to_int(
                row[
                    "total_purchase_count"
                ]
            ),
        "unique_customer_count":
            _to_int(
                row[
                    "unique_customer_count"
                ]
            ),
        "customer_penetration_pct":
            _to_float(
                row[
                    "customer_penetration_pct"
                ],
                2,
            ),
        "product_reorder_rate_pct":
            _percentage_from_probability(
                row[
                    "product_reorder_rate"
                ],
                1,
            ),
        "purchases_per_customer":
            _to_float(
                row[
                    "purchases_per_customer"
                ],
                2,
            ),
        "purchase_rank":
            row[
                "purchase_rank"
            ],
        "department_purchase_rank":
            row[
                "department_purchase_rank"
            ],
        "demand_tier":
            row[
                "demand_tier"
            ],
        "repeat_behavior_tier":
            row[
                "repeat_behavior_tier"
            ],
        "metric_reliability":
            row[
                "metric_reliability"
            ],
        "product_segment":
            row[
                "product_segment"
            ],
        "business_focus":
            row[
                "business_focus"
            ],
    }


# ============================================================
# RECOMMENDATION INTELLIGENCE
# ============================================================


@app.get(
    "/api/recommendations/overview",
    tags=["Recommendation Intelligence"],
)
def recommendation_overview():
    """
    Executive KPIs for the served recommendation system.
    """

    data = (
        get_recommendation_intelligence_overview()
    )

    if not data:
        raise HTTPException(
            status_code=404,
            detail=(
                "Recommendation intelligence is not available."
            ),
        )

    return {
        "customers_served":
            _to_int(
                data[
                    "customers_served"
                ]
            ),
        "recommendations_generated":
            _to_int(
                data[
                    "recommendations_generated"
                ]
            ),
        "avg_purchase_probability_pct":
            _to_float(
                data[
                    "avg_purchase_probability_pct"
                ],
                1,
            ),
        "reorder_recommendations":
            _to_int(
                data[
                    "reorder_recommendations"
                ]
            ),
        "new_or_discovery_recommendations":
            _to_int(
                data[
                    "non_reorder_recommendations"
                ]
            ),
        "departments_recommended":
            _to_int(
                data[
                    "departments_recommended"
                ]
            ),
    }


@app.get(
    "/api/recommendations/source-mix",
    tags=["Recommendation Intelligence"],
)
def recommendation_source_mix():
    """
    Candidate-generation source distribution.
    """

    rows = (
        get_recommendation_source_mix()
    )

    sources = [
        {
            "candidate_source":
                row[
                    "candidate_source"
                ],
            "recommendation_count":
                _to_int(
                    row[
                        "recommendation_count"
                    ]
                ),
            "share_pct":
                _to_float(
                    row[
                        "share_pct"
                    ],
                    2,
                ),
        }
        for row in rows
    ]

    return {
        "count":
            len(sources),
        "sources":
            sources,
    }


@app.get(
    "/api/recommendations/rank-performance",
    tags=["Recommendation Intelligence"],
)
def recommendation_rank_performance():
    """
    Average prediction probability by served recommendation rank.
    """

    rows = (
        get_recommendation_rank_performance()
    )

    ranks = [
        {
            "recommendation_rank":
                row[
                    "recommendation_rank"
                ],
            "recommendation_count":
                _to_int(
                    row[
                        "recommendation_count"
                    ]
                ),
            "avg_purchase_probability_pct":
                _to_float(
                    row[
                        "avg_purchase_probability_pct"
                    ],
                    1,
                ),
        }
        for row in rows
    ]

    return {
        "count":
            len(ranks),
        "ranks":
            ranks,
    }


@app.get(
    "/api/recommendations/departments",
    tags=["Recommendation Intelligence"],
)
def recommendation_departments(
    limit: int = Query(
        default=10,
        ge=1,
        le=50,
    ),
):
    """
    Departments most represented in served recommendations.
    """

    rows = (
        get_recommendation_departments(
            limit=limit
        )
    )

    departments = [
        {
            "department":
                row[
                    "department"
                ],
            "recommendation_count":
                _to_int(
                    row[
                        "recommendation_count"
                    ]
                ),
            "avg_purchase_probability_pct":
                _to_float(
                    row[
                        "avg_purchase_probability_pct"
                    ],
                    1,
                ),
        }
        for row in rows
    ]

    return {
        "count":
            len(departments),
        "departments":
            departments,
    }


# ============================================================
# CUSTOMER INTELLIGENCE — AGGREGATE
# ============================================================


@app.get(
    "/api/customer-intelligence/overview",
    tags=["Customer Intelligence"],
)
def customer_intelligence_overview():
    """
    Aggregate behavioral KPIs from Customer Shopping DNA.
    """

    data = (
        get_customer_intelligence_overview()
    )

    if not data:
        raise HTTPException(
            status_code=404,
            detail=(
                "Customer intelligence is not available."
            ),
        )

    return {
        "customers_profiled":
            _to_int(
                data[
                    "customers_profiled"
                ]
            ),
        "avg_basket_size":
            _to_float(
                data[
                    "avg_basket_size"
                ],
                1,
            ),
        "avg_days_between_orders":
            _to_float(
                data[
                    "avg_days_between_orders"
                ],
                1,
            ),
        "behavior_scores": {
            "loyalty":
                _to_float(
                    data[
                        "avg_loyalty_score"
                    ],
                    1,
                ),
            "exploration":
                _to_float(
                    data[
                        "avg_exploration_score"
                    ],
                    1,
                ),
            "routine":
                _to_float(
                    data[
                        "avg_routine_score"
                    ],
                    1,
                ),
            "basket_intensity":
                _to_float(
                    data[
                        "avg_basket_intensity_score"
                    ],
                    1,
                ),
            "category_focus":
                _to_float(
                    data[
                        "avg_category_concentration_score"
                    ],
                    1,
                ),
        },
    }


@app.get(
    "/api/customer-intelligence/personas",
    tags=["Customer Intelligence"],
)
def customer_personas(
    limit: int = Query(
        default=10,
        ge=1,
        le=25,
    ),
):
    """
    Shopping persona distribution.
    """

    rows = (
        get_customer_persona_distribution(
            limit=limit
        )
    )

    personas = [
        {
            "shopping_persona":
                row[
                    "shopping_persona"
                ],
            "customer_count":
                _to_int(
                    row[
                        "customer_count"
                    ]
                ),
            "share_pct":
                _to_float(
                    row[
                        "share_pct"
                    ],
                    2,
                ),
        }
        for row in rows
    ]

    return {
        "count":
            len(personas),
        "personas":
            personas,
    }


@app.get(
    "/api/customer-intelligence/favorite-departments",
    tags=["Customer Intelligence"],
)
def customer_favorite_departments(
    limit: int = Query(
        default=10,
        ge=1,
        le=50,
    ),
):
    """
    Most common strongest department affinities across customers.
    """

    rows = (
        get_customer_favorite_departments(
            limit=limit
        )
    )

    departments = [
        {
            "department":
                row[
                    "department"
                ],
            "customer_count":
                _to_int(
                    row[
                        "customer_count"
                    ]
                ),
            "customer_share_pct":
                _to_float(
                    row[
                        "customer_share_pct"
                    ],
                    2,
                ),
            "avg_affinity_pct":
                _to_float(
                    row[
                        "avg_affinity_pct"
                    ],
                    1,
                ),
        }
        for row in rows
    ]

    return {
        "count":
            len(departments),
        "departments":
            departments,
    }


# ============================================================
# CUSTOMER 360 / EXISTING ML CAPABILITIES
# ============================================================


@app.get(
    "/api/customers",
    tags=["Customer 360"],
)
def list_customers(
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
):
    """
    Return customers with available served recommendation data.
    """

    customers = get_customers(
        limit
    )

    return {
        "count":
            len(customers),
        "customers":
            customers,
    }


@app.get(
    "/api/customers/{user_id}/next-basket",
    tags=["Customer 360"],
)
def customer_next_basket(
    user_id: int,
):
    """
    Return the customer's Top-10 next-basket ML predictions.
    """

    predictions = (
        get_next_basket_predictions(
            user_id
        )
    )

    return _build_next_basket_response(
        user_id,
        predictions,
    )


@app.get(
    "/api/customers/{user_id}/reorder-planner",
    tags=["Customer 360"],
)
def customer_reorder_planner(
    user_id: int,
):
    """
    Return customer-product reorder-cycle intelligence.

    The route name is retained for backward compatibility;
    the retailer UI will present this as reorder intelligence.
    """

    items = (
        get_customer_reorder_planner(
            user_id
        )
    )

    return _build_reorder_response(
        user_id,
        items,
    )


@app.get(
    "/api/customers/{user_id}/assistant",
    tags=["Customer 360"],
)
def customer_recommendation_intelligence(
    user_id: int,
):
    """
    Return the previously developed recommendation-strategy output.

    The endpoint path is preserved so previous work remains compatible,
    while the new retailer UI presents it as recommendation intelligence.
    """

    recommendations = (
        get_customer_recommendations(
            user_id
        )
    )

    return _build_recommendation_response(
        user_id,
        recommendations,
    )


@app.get(
    "/api/customers/{user_id}/shopping-dna",
    tags=["Customer 360"],
)
def customer_shopping_dna(
    user_id: int,
):
    """
    Return the behavioral Shopping DNA profile for one customer.
    """

    dna = (
        get_customer_shopping_dna(
            user_id
        )
    )

    return _build_dna_response(
        user_id,
        dna,
    )


@app.get(
    "/api/customers/{user_id}/360",
    tags=["Customer 360"],
)
def customer_360(
    user_id: int,
):
    """
    Unified retailer-facing drill-down combining the major pieces
    of intelligence previously built during the project.

    This endpoint intentionally keeps next-basket prediction,
    recommendation strategy, reorder-cycle intelligence, and
    Shopping DNA visible as first-class capabilities.
    """

    predictions = (
        get_next_basket_predictions(
            user_id
        )
    )

    recommendations = (
        get_customer_recommendations(
            user_id
        )
    )

    dna = (
        get_customer_shopping_dna(
            user_id
        )
    )

    reorder_items = (
        get_customer_reorder_planner(
            user_id
        )
    )

    # A customer must have the core prediction/recommendation/DNA
    # layers to produce a useful Customer 360 profile.
    if not predictions:
        raise HTTPException(
            status_code=404,
            detail=(
                "No next-basket predictions found "
                f"for customer {user_id}"
            ),
        )

    if not recommendations:
        raise HTTPException(
            status_code=404,
            detail=(
                "No recommendation intelligence found "
                f"for customer {user_id}"
            ),
        )

    if not dna:
        raise HTTPException(
            status_code=404,
            detail=(
                "No Shopping DNA profile found "
                f"for customer {user_id}"
            ),
        )

    next_basket = (
        _build_next_basket_response(
            user_id,
            predictions,
        )
    )

    recommendation_intelligence = (
        _build_recommendation_response(
            user_id,
            recommendations,
        )
    )

    shopping_dna = (
        _build_dna_response(
            user_id,
            dna,
        )
    )

    reorder_intelligence = None

    if reorder_items:
        reorder_intelligence = (
            _build_reorder_response(
                user_id,
                reorder_items,
            )
        )

    return {
        "user_id":
            user_id,

        "customer_summary": {
            "persona":
                shopping_dna[
                    "profile"
                ][
                    "persona"
                ],
            "headline":
                shopping_dna[
                    "profile"
                ][
                    "headline"
                ],
            "prior_orders":
                shopping_dna[
                    "history"
                ][
                    "prior_orders"
                ],
            "unique_products":
                shopping_dna[
                    "history"
                ][
                    "unique_products"
                ],
            "favorite_department":
                shopping_dna[
                    "category_signature"
                ][
                    "departments"
                ][0][
                    "name"
                ],
            "top_prediction_probability_pct":
                next_basket[
                    "predictions"
                ][0][
                    "predicted_probability_pct"
                ],
            "reorder_attention_count": (
                reorder_intelligence[
                    "attention_count"
                ]
                if reorder_intelligence
                else 0
            ),
        },

        "next_basket":
            next_basket,

        "recommendation_intelligence":
            recommendation_intelligence,

        "reorder_intelligence":
            reorder_intelligence,

        "shopping_dna":
            shopping_dna,
    }
