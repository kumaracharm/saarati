"""FastAPI application factory for EntitleIQ."""

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import routes
from app.config import get_settings


def create_app() -> FastAPI:
    """Build and configure the EntitleIQ FastAPI application.

    Returns:
        A configured ``FastAPI`` instance with CORS, routes, a health check and
        JSON error handlers.
    """
    app = FastAPI(
        title="SAARTHI API",
        description="India's Citizen Benefits Discovery & Assistance Platform",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_settings().cors_origin_list,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(routes.router, prefix="")

    @app.get("/health")
    def health() -> dict[str, str]:
        """Report that the service is running.

        Returns:
            A status payload marking the catalogue as demonstration only.
        """
        return {
            "status": "ok",
            "service": "entitleiq-api",
            "catalogue": "demonstration_only",
        }

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Return request validation failures as a 422 JSON error.

        Args:
            request: The incoming request (unused).
            exc: The validation error raised by FastAPI.

        Returns:
            A 422 JSON response listing the validation errors.
        """
        return JSONResponse(
            status_code=422,
            content={
                "error": "validation_error",
                "detail": jsonable_encoder(exc.errors()),
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """Return any unhandled exception as a generic 500 JSON error.

        Args:
            request: The incoming request (unused).
            exc: The unhandled exception. It is not exposed to the client.

        Returns:
            A 500 JSON response with a generic message.
        """
        return JSONResponse(
            status_code=500,
            content={"error": "internal_error", "detail": "Unexpected server error"},
        )

    return app


app = create_app()
