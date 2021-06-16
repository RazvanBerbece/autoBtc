# autoBtc
Bitcoin trading bot built using NodeJS which uses a volatility-based trading strategy.

Built on the Demo HitBTC crypto exchange platform with the use of their API.

# Progress
[x] Crypto Exchange Client Prototype (implemented)

[x] Buy & Sell orders (implemented)

[~] Business strategy written into trading bot (progressing)

[x] Automation (implemented)

# NPM Packages
1. node-fetch
2. Decimal.js

I recommend using 'npm i' when first cloning the repo in order to install all required packages.

# Secrets & API Keys
In order to run the project, the user should get a public:secret key pair from Demo HitBTC.

The API credentials should then be placed in a dictionary 'classes/HTTP/assets' in a 'secrets.js' file which contains API_KEY and SECRET_KEY. 

Finally, export the dictionary and use it in the HTTP client.
