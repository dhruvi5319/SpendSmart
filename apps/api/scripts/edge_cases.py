"""
Hand-curated edge-case test set for the categorization model.

Each tuple is (description, human_label, why_tricky). These are NOT in
the 539-example training set and deliberately target known failure modes:

  - Bare merchant names with no category-suggesting words ("Amazon", "Target")
  - Brands that span multiple categories depending on context
  - Short or ambiguous descriptions
  - Modifiers that flip a brand into a different category (e.g. "Uber Eats"
    vs "Uber"; "Costco gas" vs "Costco")
"""

EDGE_CASES: list[tuple[str, str, str]] = [
    # Bare merchant names — the merchant alone is ambiguous
    ("Amazon",            "Shopping",        "bare merchant; could be Shopping, Subscriptions (Prime), or Groceries (Fresh)"),
    ("Target",            "Shopping",        "bare merchant; sells groceries, household, clothing"),
    ("Walmart",           "Shopping",        "bare merchant; groceries, electronics, clothing"),
    ("Costco",            "Groceries",       "bare merchant; primarily groceries but also gas and shopping"),
    ("Apple",             "Shopping",        "could be hardware (Shopping), software (Subscriptions), or App Store"),

    # Same merchant, different category by modifier
    ("Costco gas",        "Transportation",  "modifier 'gas' should override merchant default"),
    ("Uber",              "Transportation",  "rideshare"),
    ("Uber Eats",         "Food & Dining",   "same brand, different vertical"),
    ("Amazon Fresh",      "Groceries",       "Amazon's grocery arm"),
    ("Amazon Prime",      "Subscriptions",   "Amazon's subscription"),

    # Daily-coffee ambiguity
    ("Starbucks",         "Food & Dining",   "bare brand; if daily, arguably a recurring habit"),
    ("Starbucks app reload", "Food & Dining","could be a Subscriptions read"),

    # Cross-category traps
    ("Netflix gift card", "Shopping",        "gift card purchase is Shopping, not the Subscriptions service"),
    ("Spotify family",    "Subscriptions",   "could be confused with Entertainment"),
    ("YouTube Premium",   "Subscriptions",   "vs Entertainment"),
    ("CVS pharmacy",      "Healthcare",      "CVS also sells personal-care items"),
    ("Walgreens shampoo", "Personal Care",   "pharmacy chain selling personal-care goods"),
    ("Dollar Tree",       "Shopping",        "low-priced merchandise, ambiguous"),

    # Short / single-word inputs
    ("Gas",               "Transportation",  "single word; could also be Utilities"),
    ("Rent",              "Housing",         "single word but high signal"),
    ("Tuition",           "Education",       "single word"),
    ("Haircut",           "Personal Care",   "single word"),

    # Out-of-vocabulary / regional merchants the training set likely missed
    ("Trader Joes",       "Groceries",       "in training set as 'Trader Joe's' — punctuation test"),
    ("H Mart",            "Groceries",       "Korean grocery chain, likely OOV"),
    ("Erewhon",           "Groceries",       "specialty grocer, almost certainly OOV"),
    ("Rappi delivery",    "Food & Dining",   "non-US delivery app, likely OOV"),

    # Legitimately ambiguous cases (no single right answer)
    ("Monthly bus pass",  "Transportation",  "could be Subscriptions framing"),
    ("Gym membership",    "Personal Care",   "could be Healthcare or Subscriptions"),
    ("Therapist session", "Healthcare",      "could be Personal Care"),
]
