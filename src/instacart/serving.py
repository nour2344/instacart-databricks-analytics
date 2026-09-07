REQUIRED_RECOMMENDATION_COLUMNS = {
    "user_id",
    "target_order_id",
    "recommendation_rank",
    "product_id",
    "product_name",
    "aisle",
    "department",
    "purchase_probability",
    "is_new_to_customer",
    "candidate_source",
    "recommendation_strategy",
}


def validate_recommendation_export(columns, row_count):
    """Validate recommendation data before overwriting the serving database."""

    if row_count <= 0:
        raise ValueError(
            "Recommendation export aborted: source table is empty."
        )

    missing_columns = (
        REQUIRED_RECOMMENDATION_COLUMNS - set(columns)
    )

    if missing_columns:
        raise ValueError(
            "Recommendation export aborted. Missing required columns: "
            + ", ".join(sorted(missing_columns))
        )

    return True