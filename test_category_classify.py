from tools.scoring import classify_opportunity_category

test_cases = [
    ("Namecoach/Euphonia", "SF or Remote", "Voice AI startup, remote OK, part-time backend engineer"),
    ("TinyStack", "Full Stack Intern", "Remote full-stack role, React + Node"),
    ("BigCorp", "Backend Engineer", "Onsite in Bangalore, backend infrastructure team"),
    ("RandomCo", "Marketing Manager", "Onsite in Delhi, marketing role"),
]

for company, role, desc in test_cases:
    category = classify_opportunity_category(company, role, desc)
    print(f"{company} ({role}) -> {category}")