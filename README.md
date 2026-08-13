# Instacart End-to-End Data Analytics Pipeline

An end-to-end data analytics project built with **Databricks, PySpark, Delta Lake, PostgreSQL, and Neon**, using the Instacart Market Basket dataset.

The project covers the full analytics lifecycle: data ingestion, data quality validation, cleaning and transformation, KPI engineering, behavioral analysis, visualization, cloud database integration, and an evolving machine learning layer for customer-product reorder prediction.

---

## Project Overview

Online grocery platforms generate large amounts of transactional data that can be used to better understand:

- customer purchasing behavior;
- product popularity;
- customer loyalty;
- reorder patterns;
- category performance;
- ordering habits throughout the week and day.

This project analyzes Instacart grocery-order data using a scalable data-processing workflow in **Databricks**.

The current pipeline transforms raw CSV files into validated Delta tables, builds reusable analytical datasets, calculates business KPIs, creates visualizations and dashboards, and exports analytical tables to a cloud-hosted **PostgreSQL database on Neon**.

The project is being extended with feature engineering and machine learning to predict future product reorders.

---

## Business Objectives

The project aims to answer several business questions.

### Product Analysis

- Which products are purchased most frequently?
- Which products generate the highest customer loyalty?
- Are the most popular products also the most frequently reordered?
- Which products combine high demand and high reorder rates?

### Category Analysis

- Which departments generate the highest purchase volume?
- Which aisles contain the most frequently purchased products?
- Which product categories dominate customer baskets?

### Customer Analysis

- How frequently do customers place orders?
- How are customers distributed across frequency segments?
- Which customers demonstrate higher levels of engagement and loyalty?

### Temporal Analysis

- Which days generate the highest ordering activity?
- At what hours are customers most active?
- How does purchasing behavior change between morning, afternoon, evening, and night?

### Future Predictive Objective

The next phase of the project focuses on:

> **Predicting whether a customer is likely to reorder a product.**

This will allow the project to move from descriptive analytics toward predictive analytics and recommendation-oriented use cases.

---

# Dataset

The project uses the **Instacart Market Basket Analysis** dataset.

The dataset represents grocery shopping behavior across more than 200,000 customers and contains information about:

- customers;
- orders;
- products;
- departments;
- aisles;
- product positions inside baskets;
- reordered products;
- order sequence;
- order day;
- order hour;
- time elapsed between orders.

### Main Source Tables

| Table | Description |
|---|---|
| `orders` | Order-level information for each customer |
| `order_products_prior` | Products from customers' historical orders |
| `order_products_train` | Products contained in training orders |
| `products` | Product catalogue |
| `aisles` | Product aisle reference data |
| `departments` | Product department reference data |

### Dataset Scale

The dataset contains approximately:

- **206,209 customers**
- **3.4 million orders**
- **49,688 products**
- **134 aisles**
- **21 departments**
- more than **33 million customer-product interactions**

The large transaction volume makes the dataset appropriate for distributed processing with PySpark.

---

# Technology Stack

| Technology | Role |
|---|---|
| **Databricks** | Main analytics and data engineering environment |
| **Apache Spark / PySpark** | Distributed data transformation and analysis |
| **Delta Lake** | Storage format for processed Databricks tables |
| **Spark SQL** | Data querying and validation |
| **Python** | Data processing and analytical logic |
| **Databricks Visualizations** | Exploratory analysis and charts |
| **Databricks Dashboard** | KPI and business visualization layer |
| **PostgreSQL** | Relational analytical serving layer |
| **Neon** | Serverless PostgreSQL cloud database |
| **JDBC** | Databricks-to-PostgreSQL connectivity |
| **Git** | Version control |
| **GitHub** | Project documentation and source-code repository |

---

# Project Architecture

```mermaid
flowchart TD

    A[Instacart CSV Dataset]

    A --> B[01 - Data Ingestion]

    B --> C[Databricks Delta Tables<br/>imported_data]

    C --> D[02 - Data Quality Validation]

    D --> E[03 - Cleaning & Transformation]

    E --> F[Databricks Delta Tables<br/>cleaned_data]

    F --> G[04 - KPI Engineering]

    G --> H[Analytical Tables<br/>analysis_data]

    H --> I[05 - Data Analysis & Visualization]

    I --> J[Databricks Dashboard]

    H --> K[06 - Neon PostgreSQL Integration]

    K --> L[Neon PostgreSQL<br/>Serving Layer]

    H --> M[07 - Feature Engineering]

    M --> N[Machine Learning Model]

    N --> O[Reorder Predictions]

    O --> L
