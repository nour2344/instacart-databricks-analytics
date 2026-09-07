import pytest

from src.instacart.streaming import (
    REQUIRED_ORDER_COLUMNS,
    validate_order_schema,
)


def test_valid_order_schema_passes():
    assert validate_order_schema(REQUIRED_ORDER_COLUMNS)


def test_missing_order_id_is_rejected():
    columns = REQUIRED_ORDER_COLUMNS - {"order_id"}

    with pytest.raises(ValueError, match="order_id"):
        validate_order_schema(columns)


def test_missing_multiple_columns_are_rejected():
    columns = REQUIRED_ORDER_COLUMNS - {
        "user_id",
        "order_hour_of_day",
    }

    with pytest.raises(ValueError):
        validate_order_schema(columns)