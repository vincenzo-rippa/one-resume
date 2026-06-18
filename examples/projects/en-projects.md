# Projects

## Ledger Pipeline

_2022 – 2023_

**Associated with:** Northwind Labs

A append-only billing ledger that ingests usage events and emits reconciled invoices.

**Highlights**

- Processed several million events per day with exactly-once accounting
- Cut month-end close from three days to under an hour

**Selected technologies:** TypeScript, PostgreSQL, Kafka

---

## Edge Cache

_2020 – 2021_

A read-through cache layer that shields the primary database from traffic spikes.

**Highlights**

- Sustained a 96% hit rate under peak load
- Added per-key circuit breaking to contain hot-key incidents

**Selected technologies:** Go, Redis, Prometheus

<!-- keywords: projects, billing, ledger, caching, distributed systems -->
