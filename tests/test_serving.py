import pytest

from src.instacart.serving import (
    REQUIRED_RECOMMENDATION_COLUMNS,
    validate_recommendation_export,
)


def test_valid_recommendations_pass():
    assert validate_recommendation_export(
        REQUIRED_RECOMMENDATION_COLUMNS,
        131800,
    )


def test_empty_export_is_rejected():
    with pytest.raises(
        ValueError,
        match="source table is empty",
    ):
        validate_recommendation_export(
            REQUIRED_RECOMMENDATION_COLUMNS,
            0,
        )


def test_missing_required_column_is_rejected():
    columns = (
        REQUIRED_RECOMMENDATION_COLUMNS
        - {"product_id"}
    )

    with pytest.raises(
        ValueError,
        match="product_id",
    ):
        validate_recommendation_export(
            columns,
            100,
        )