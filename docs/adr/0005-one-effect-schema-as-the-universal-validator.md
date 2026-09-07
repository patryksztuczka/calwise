# Effect Schema as the shared validator

Shared API schemas live in `@calwise/shared`. tRPC uses `Schema.toStandardSchemaV1` to validate the greeting response, so we don't need another validation library.

The Hello World foundation has no user inputs or forms. Future inputs should use shared schemas rather than duplicating validation between applications.
