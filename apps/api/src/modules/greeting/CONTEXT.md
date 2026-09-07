# Greeting

The message the api hands to the web app to prove the whole path works: browser → Worker → D1. It is the foundation's only domain concept and exists to be replaced.

## Language

**Greeting**:
A single stored message shown on the home page. The first migration seeds exactly one; the api returns the lowest-id row.
_Avoid_: Hello, Welcome message
