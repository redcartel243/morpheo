import google.generativeai as genai

# Configure the model (replace with your API key)
genai.configure(api_key="AIzaSyAKHiqXwIYho5om3dXG_BEtstnbJ5pGnIQ")
model = genai.GenerativeModel("gemini-2.0-flash")

prompt = f"""Search for information about the top 3 tourist attractions in Barcelona.
Return the results as a JSON object with the following structure:
{{
  "attractions": [
    {{
      "name": "string",
      "description": "string",
      "rating": "number"
    }},
    {{
      "name": "string",
      "description": "string",
      "rating": "number"
    }},
    {{
      "name": "string",
      "description": "string",
      "rating": "number"
    }}
  ]
}}
"""

response = model.generate_content(prompt)

if response.parts:
    try:
        structured_data = response.parts[0].text
        print(structured_data)
        # You might need to further parse this string into a Python dictionary
        import json
        data = json.loads(structured_data)
        print(data)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
        print(f"Raw response: {response.parts[0].text}")
else:
    print("No response received.")