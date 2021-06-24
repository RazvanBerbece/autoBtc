# autoBtc
Bitcoin trading bot built using NodeJS which uses a volatility-based trading strategy.

Built on the Demo HitBTC crypto exchange platform with the use of their Websockets API.

# Progress
[x] Websockets API Client

[x] Buy & Sell orders 

[x] Trading strategy written into trading bot (To be migrated from the REST API version)

[x] Automation (To be migrated from the REST API version)


# NPM Packages
1. ws
2. fs

I recommend using 'npm i' when first cloning the repo in order to install all required packages.

# Secrets & API Keys
In order to run the project, the user should get a public:secret key pair from Demo HitBTC.

The API credentials should then be placed in a dictionary 'classes/HTTP/assets' in a 'secrets.js' file which contains API_KEY and SECRET_KEY. 

Finally, export the dictionary and use it in the HTTP client.
