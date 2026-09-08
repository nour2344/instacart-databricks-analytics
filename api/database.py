import os

import psycopg
from dotenv import load_dotenv


load_dotenv(
    os.path.join(
        os.path.dirname(__file__),
        ".env"
    )
)


def get_connection():
    """
    Create a PostgreSQL connection to Neon.
    """

    required_variables = [
        "NEON_HOST",
        "NEON_PORT",
        "NEON_DATABASE",
        "NEON_USER",
        "NEON_PASSWORD",
    ]

    missing = [
        variable
        for variable in required_variables
        if not os.getenv(variable)
    ]

    if missing:
        raise RuntimeError(
            f"Missing environment variables: {missing}"
        )

    return psycopg.connect(
        host=os.getenv("NEON_HOST"),
        port=os.getenv("NEON_PORT"),
        dbname=os.getenv("NEON_DATABASE"),
        user=os.getenv("NEON_USER"),
        password=os.getenv("NEON_PASSWORD"),
        sslmode="require",
    )