from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.database import get_connection
from api.repository import (
    get_customer_recommendations,
    get_customers,
    get_next_basket_predictions,
    get_customer_shopping_dna,
    get_customer_reorder_planner,
)


# ============================================================
# FastAPI application
# ============================================================

app = FastAPI(
    title="Instacart Smart Shopping Assistant API",
    description=(
        "Backend API serving personalized next-basket predictions "
        "and Smart Shopping Assistant recommendations generated "
        "from the Databricks ML pipeline."
    ),
    version="1.0.0",
)


# ============================================================
# CORS
# Allow the React frontend to communicate with FastAPI
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Root
# ============================================================

@app.get("/")
def root():
    return {
        "service": "Instacart Smart Shopping Assistant API",
        "status": "running",
        "features": [
            "next_basket_prediction",
            "smart_shopping_assistant",
        ],
    }


# ============================================================
# Health check
# ============================================================

@app.get("/health")
def health():
    """
    Verify API and Neon PostgreSQL connectivity.
    """

    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                result = cursor.fetchone()

        if result != (1,):
            raise RuntimeError(
                "Unexpected database health-check result."
            )

        return {
            "status": "healthy",
            "database": "connected",
        }

    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(exc),
            },
        )


# ============================================================
# Customer list
# ============================================================

@app.get("/api/customers")
def list_customers(limit: int = 100):
    """
    Return customers with available shopping intelligence.
    """

    if limit < 1 or limit > 500:
        raise HTTPException(
            status_code=400,
            detail="limit must be between 1 and 500",
        )

    customers = get_customers(limit)

    return {
        "count": len(customers),
        "customers": customers,
    }


# ============================================================
# Next-Basket Prediction
# ============================================================

@app.get("/api/customers/{user_id}/next-basket")
def customer_next_basket(user_id: int):
    """
    Return the Top-10 ML-predicted products
    for the customer's next basket.
    """

    predictions = get_next_basket_predictions(user_id)

    if not predictions:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No next-basket predictions found "
                f"for customer {user_id}"
            ),
        )

    predicted_products = []

    for prediction in predictions:
        predicted_products.append(
            {
                "rank": prediction["prediction_rank"],
                "product_id": prediction["product_id"],
                "product_name": prediction["product_name"],
                "aisle": prediction["aisle"],
                "department": prediction["department"],

                "purchase_probability": round(
                    float(
                        prediction["purchase_probability"]
                    ),
                    4,
                ),

                "predicted_probability_pct": round(
                    float(
                        prediction[
                            "predicted_probability_pct"
                        ]
                    ),
                    1,
                ),

                "prediction_type": prediction[
                    "prediction_type"
                ],

                "is_new_to_customer": bool(
                    prediction["is_new_to_customer"]
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
        "total_predictions": len(predictions),
        "model_output": "next_basket_prediction",
        "predictions": predicted_products,
    }

# ============================================================
# Reorder Planner
# ============================================================

@app.get("/api/customers/{user_id}/reorder-planner")
def customer_reorder_planner(user_id: int):
    """
    Return reorder-cycle intelligence for one customer.
    """

    items = get_customer_reorder_planner(user_id)

    if not items:
        raise HTTPException(
            status_code=404,
            detail=f"No reorder-planner data found for customer {user_id}",
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
        "NO_ESTABLISHED_CYCLE": "no_established_cycle",
    }

    for item in items:
        status = item["reorder_status"]

        section = status_mapping.get(
            status,
            "other",
        )

        avg_gap = item["user_product_avg_order_gap"]
        orders_since = item[
            "orders_since_last_product_purchase"
        ]

        reorder_rate = item["user_product_reorder_rate"]

        sections[section].append(
            {
                "product_id": item["product_id"],
                "rank": item["recommendation_rank"],

                "product_name": item["product_name"],
                "aisle": item["aisle"],
                "department": item["department"],

                "purchase_probability": round(
                    float(item["purchase_probability"]),
                    4,
                ),

                "purchase_probability_pct": round(
                    float(item["purchase_probability"]) * 100,
                    1,
                ),

                "reorder_status": status,

                "orders_since_last_purchase": orders_since,

                "usual_order_gap": (
                    round(float(avg_gap), 1)
                    if avg_gap is not None
                    else None
                ),

                "due_score": (
                    round(
                        float(item["user_product_due_score"]),
                        2,
                    )
                    if item["user_product_due_score"] is not None
                    else None
                ),

                "historical_reorder_rate_pct": (
                    round(float(reorder_rate) * 100, 1)
                    if reorder_rate is not None
                    else None
                ),

                "action": item["client_action"],

                "why": item["why_recommended"],
            }
        )

    counts = {
        name: len(values)
        for name, values in sections.items()
    }

    attention_count = (
        counts["overdue"]
        + counts["due_now"]
    )

    upcoming_count = counts["due_soon"]

    if attention_count > 0:
        planner_summary = (
            f"{attention_count} "
            f"{'product needs' if attention_count == 1 else 'products need'} "
            "your attention now."
        )

    elif upcoming_count > 0:
        planner_summary = (
            f"{upcoming_count} "
            f"{'product is' if upcoming_count == 1 else 'products are'} "
            "approaching the usual reorder window."
        )

    else:
        planner_summary = (
            "Nothing appears urgently due right now."
        )

    return {
        "user_id": user_id,
        "target_order_id": items[0]["target_order_id"],

        "total_reorder_products": len(items),

        "attention_count": attention_count,
        "upcoming_count": upcoming_count,

        "planner_summary": planner_summary,

        "status_counts": counts,

        "sections": sections,
    }
# ============================================================
# Smart Shopping Assistant
# ============================================================

@app.get("/api/customers/{user_id}/assistant")
def customer_shopping_assistant(user_id: int):
    """
    Return personalized Smart Shopping Assistant
    recommendations for one customer.
    """

    recommendations = get_customer_recommendations(
        user_id
    )

    if not recommendations:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No recommendations found "
                f"for customer {user_id}"
            ),
        )

    # --------------------------------------------------------
    # Website shopping sections
    # --------------------------------------------------------

    sections = {
        "reorder_now": [],
        "coming_up": [],
        "favorites_for_later": [],
        "discover": [],
        "other_recommendations": [],
    }

    section_mapping = {
        "REORDER_NOW": "reorder_now",
        "COMING_UP": "coming_up",
        "FAVORITES_FOR_LATER": "favorites_for_later",
        "DISCOVER": "discover",
        "OTHER_RECOMMENDATIONS": "other_recommendations",
    }

    # --------------------------------------------------------
    # Transform database recommendations into
    # client-friendly objects
    # --------------------------------------------------------

    for recommendation in recommendations:
        section = section_mapping.get(
            recommendation["shopping_section"],
            "other_recommendations",
        )

        sections[section].append(
            {
                "product_id": recommendation[
                    "product_id"
                ],

                "rank": recommendation[
                    "recommendation_rank"
                ],

                "product_name": recommendation[
                    "product_name"
                ],

                "aisle": recommendation[
                    "aisle"
                ],

                "department": recommendation[
                    "department"
                ],

                "purchase_probability": round(
                    float(
                        recommendation[
                            "purchase_probability"
                        ]
                    ),
                    4,
                ),

                "recommendation_type": recommendation[
                    "recommendation_type"
                ],

                "reorder_status": recommendation[
                    "reorder_status"
                ],

                "action": recommendation[
                    "client_action"
                ],

                "why_recommended": recommendation[
                    "why_recommended"
                ],
            }
        )

    # --------------------------------------------------------
    # Section counts
    # --------------------------------------------------------

    section_counts = {
        "reorder_now": len(
            sections["reorder_now"]
        ),

        "coming_up": len(
            sections["coming_up"]
        ),

        "favorites_for_later": len(
            sections["favorites_for_later"]
        ),

        "discover": len(
            sections["discover"]
        ),

        "other_recommendations": len(
            sections["other_recommendations"]
        ),
    }

    # --------------------------------------------------------
    # Personalized shopping summary
    # --------------------------------------------------------

    summary_parts = []

    reorder_count = section_counts[
        "reorder_now"
    ]

    if reorder_count > 0:
        if reorder_count == 1:
            summary_parts.append(
                "1 item is ready to reorder now"
            )
        else:
            summary_parts.append(
                f"{reorder_count} items are ready "
                "to reorder now"
            )

    coming_up_count = section_counts[
        "coming_up"
    ]

    if coming_up_count > 0:
        if coming_up_count == 1:
            summary_parts.append(
                "1 item is coming up soon"
            )
        else:
            summary_parts.append(
                f"{coming_up_count} items are "
                "coming up soon"
            )

    favorites_count = section_counts[
        "favorites_for_later"
    ]

    if favorites_count > 0:
        if favorites_count == 1:
            summary_parts.append(
                "1 favorite can wait until later"
            )
        else:
            summary_parts.append(
                f"{favorites_count} favorites can "
                "wait until later"
            )

    discover_count = section_counts[
        "discover"
    ]

    if discover_count > 0:
        if discover_count == 1:
            summary_parts.append(
                "1 new product is available "
                "to discover"
            )
        else:
            summary_parts.append(
                f"{discover_count} new products "
                "are available to discover"
            )

    if summary_parts:
        shopping_summary = (
            ". ".join(summary_parts) + "."
        )
    else:
        shopping_summary = (
            "Your personalized recommendations "
            "are ready."
        )

    # --------------------------------------------------------
    # API response
    # --------------------------------------------------------

    return {
        "user_id": user_id,

        "target_order_id": recommendations[0][
            "target_order_id"
        ],

        "total_recommendations": len(
            recommendations
        ),

        "shopping_summary": shopping_summary,

        "section_counts": section_counts,

        "sections": sections,
    }

    # ============================================================
# Customer Shopping DNA
# ============================================================

@app.get("/api/customers/{user_id}/shopping-dna")
def customer_shopping_dna(user_id: int):
    """
    Return the behavioral Shopping DNA profile
    for one customer.
    """

    dna = get_customer_shopping_dna(user_id)

    if not dna:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No Shopping DNA profile found "
                f"for customer {user_id}"
            ),
        )

    return {
        # ----------------------------------------------------
        # Customer identity
        # ----------------------------------------------------
        "user_id": dna["user_id"],

        # ----------------------------------------------------
        # Behavioral identity
        # ----------------------------------------------------
        "profile": {
            "persona": dna["shopping_persona"],
            "headline": dna["dna_headline"],
            "dna_code": dna["shopping_dna_code"],
            "dominant_trait": dna["dominant_dna_trait"],
            "dominant_score": float(
                dna["dominant_dna_score"]
            ),
        },

        # ----------------------------------------------------
        # Main narrative
        # ----------------------------------------------------
        "summary": dna["shopping_dna_summary"],
        "persona_description": dna[
            "persona_description"
        ],

        # ----------------------------------------------------
        # DNA fingerprint
        # ----------------------------------------------------
        "fingerprint": {
            "loyalty": float(
                dna["loyalty_score"]
            ),
            "exploration": float(
                dna["exploration_score"]
            ),
            "routine": float(
                dna["routine_score"]
            ),
            "basket_intensity": float(
                dna["basket_intensity_score"]
            ),
            "category_focus": float(
                dna["category_concentration_score"]
            ),
        },

        # ----------------------------------------------------
        # Shopping rhythm
        # ----------------------------------------------------
        "shopping_rhythm": {
            "frequency": dna[
                "shopping_frequency"
            ],
            "regularity": dna[
                "shopping_regularity"
            ],
            "basket_momentum": dna[
                "basket_momentum"
            ],
            "avg_basket_size": float(
                dna["avg_basket_size"]
            ),
            "avg_days_between_orders": float(
                dna["avg_days_between_orders"]
            ),
            "preferred_hour": dna[
                "preferred_hour"
            ],
            "preferred_hour_label": dna[
                "preferred_hour_label"
            ],
            "preferred_time_period": dna[
                "preferred_time_period"
            ],
        },

        # ----------------------------------------------------
        # Shopping history
        # ----------------------------------------------------
        "history": {
            "prior_orders": dna[
                "customer_prior_orders"
            ],
            "unique_products": dna[
                "customer_unique_products"
            ],
            "loyalty_profile": dna[
                "loyalty_profile"
            ],
        },

        # ----------------------------------------------------
        # Category signature
        # ----------------------------------------------------
        "category_signature": {
            "departments": [
                {
                    "rank": 1,
                    "name": dna[
                        "favorite_department"
                    ],
                    "affinity_pct": float(
                        dna[
                            "favorite_department_affinity_pct"
                        ]
                    )
                    if dna[
                        "favorite_department_affinity_pct"
                    ] is not None
                    else None,
                },
                {
                    "rank": 2,
                    "name": dna[
                        "second_department"
                    ],
                    "affinity_pct": float(
                        dna[
                            "second_department_affinity_pct"
                        ]
                    )
                    if dna[
                        "second_department_affinity_pct"
                    ] is not None
                    else None,
                },
                {
                    "rank": 3,
                    "name": dna[
                        "third_department"
                    ],
                    "affinity_pct": float(
                        dna[
                            "third_department_affinity_pct"
                        ]
                    )
                    if dna[
                        "third_department_affinity_pct"
                    ] is not None
                    else None,
                },
            ],

            "aisles": [
                {
                    "rank": 1,
                    "name": dna[
                        "favorite_aisle"
                    ],
                    "affinity_pct": float(
                        dna[
                            "favorite_aisle_affinity_pct"
                        ]
                    )
                    if dna[
                        "favorite_aisle_affinity_pct"
                    ] is not None
                    else None,
                },
                {
                    "rank": 2,
                    "name": dna[
                        "second_aisle"
                    ],
                    "affinity_pct": float(
                        dna[
                            "second_aisle_affinity_pct"
                        ]
                    )
                    if dna[
                        "second_aisle_affinity_pct"
                    ] is not None
                    else None,
                },
                {
                    "rank": 3,
                    "name": dna[
                        "third_aisle"
                    ],
                    "affinity_pct": float(
                        dna[
                            "third_aisle_affinity_pct"
                        ]
                    )
                    if dna[
                        "third_aisle_affinity_pct"
                    ] is not None
                    else None,
                },
            ],
        },

        # ----------------------------------------------------
        # Explainability
        # ----------------------------------------------------
        "insights": {
            "loyalty": dna[
                "loyalty_insight"
            ],
            "frequency": dna[
                "frequency_insight"
            ],
            "basket": dna[
                "basket_insight"
            ],
            "category": dna[
                "category_insight"
            ],
            "time": dna[
                "time_insight"
            ],
            "dominant_trait": dna[
                "dominant_trait_insight"
            ],
        },
    }