from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from api.database import get_connection
from api.repository import (
    get_customer_recommendations,
    get_customers,
)


app = FastAPI(
    title="Instacart Smart Shopping Assistant API",
    description=(
        "Backend API serving personalized shopping "
        "assistant recommendations generated in Databricks."
    ),
    version="1.0.0",
)


# ============================================================
# Root
# ============================================================

@app.get("/")
def root():
    return {
        "service": "Instacart Smart Shopping Assistant API",
        "status": "running",
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
    Return customers that have Smart Shopping Assistant
    recommendations available.
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
# Smart Shopping Assistant
# ============================================================

@app.get("/api/customers/{user_id}/assistant")
def customer_shopping_assistant(user_id: int):
    """
    Return personalized Smart Shopping Assistant
    recommendations for one customer.
    """

    recommendations = get_customer_recommendations(user_id)

    if not recommendations:
        raise HTTPException(
            status_code=404,
            detail=f"No recommendations found for customer {user_id}",
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
    # Transform database recommendations into client objects
    # --------------------------------------------------------

    for recommendation in recommendations:
        section = section_mapping.get(
            recommendation["shopping_section"],
            "other_recommendations",
        )

        sections[section].append(
            {
                "product_id": recommendation["product_id"],
                "rank": recommendation["recommendation_rank"],
                "product_name": recommendation["product_name"],
                "aisle": recommendation["aisle"],
                "department": recommendation["department"],
                "purchase_probability": round(
                    float(recommendation["purchase_probability"]),
                    4,
                ),
                "recommendation_type": recommendation[
                    "recommendation_type"
                ],
                "reorder_status": recommendation["reorder_status"],
                "action": recommendation["client_action"],
                "why_recommended": recommendation["why_recommended"],
            }
        )

    # --------------------------------------------------------
    # Client-friendly section counts
    # --------------------------------------------------------

    section_counts = {
        "reorder_now": len(sections["reorder_now"]),
        "coming_up": len(sections["coming_up"]),
        "favorites_for_later": len(
            sections["favorites_for_later"]
        ),
        "discover": len(sections["discover"]),
        "other_recommendations": len(
            sections["other_recommendations"]
        ),
    }

    # --------------------------------------------------------
    # Personalized shopping summary
    # --------------------------------------------------------

    summary_parts = []

    reorder_count = section_counts["reorder_now"]

    if reorder_count > 0:
        if reorder_count == 1:
            summary_parts.append(
                "1 item is ready to reorder now"
            )
        else:
            summary_parts.append(
                f"{reorder_count} items are ready to reorder now"
            )

    coming_up_count = section_counts["coming_up"]

    if coming_up_count > 0:
        if coming_up_count == 1:
            summary_parts.append(
                "1 item is coming up soon"
            )
        else:
            summary_parts.append(
                f"{coming_up_count} items are coming up soon"
            )

    favorites_count = section_counts["favorites_for_later"]

    if favorites_count > 0:
        if favorites_count == 1:
            summary_parts.append(
                "1 favorite can wait until later"
            )
        else:
            summary_parts.append(
                f"{favorites_count} favorites can wait until later"
            )

    discover_count = section_counts["discover"]

    if discover_count > 0:
        if discover_count == 1:
            summary_parts.append(
                "1 new product is available to discover"
            )
        else:
            summary_parts.append(
                f"{discover_count} new products are available to discover"
            )

    if summary_parts:
        shopping_summary = ". ".join(summary_parts) + "."
    else:
        shopping_summary = (
            "Your personalized recommendations are ready."
        )

    # --------------------------------------------------------
    # API response
    # --------------------------------------------------------

    return {
        "user_id": user_id,
        "target_order_id": recommendations[0]["target_order_id"],
        "total_recommendations": len(recommendations),
        "shopping_summary": shopping_summary,
        "section_counts": section_counts,
        "sections": sections,
    }