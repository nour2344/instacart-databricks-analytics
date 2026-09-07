REQUIRED_ORDER_COLUMNS = {
    "order_id",
    "user_id",
    "eval_set",
    "order_number",
    "order_dow",
    "order_hour_of_day",
    "days_since_prior_order",
}


def validate_order_schema(columns):
    """Validate the schema expected from incoming order files."""

    missing_columns = REQUIRED_ORDER_COLUMNS - set(columns)

    if missing_columns:
        raise ValueError(
            "Incoming order schema is invalid. Missing columns: "
            + ", ".join(sorted(missing_columns))
        )

    return True