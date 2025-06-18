# Secure Sign-In with custom authentication for CAPTCHA and Terms of Service Acknowledgement using Cognito and Amplify

## Overview
This project implements an enterprise-grade authentication solution using AWS Cognito and Amplify, featuring custom authentication flows with mandatory Terms of Service acknowledgment and Google reCAPTCHA verification.

## Features
One-click AWS CloudFormation deployment
Custom authentication workflow
Terms of Service (ToS) verification
Google reCAPTCHA integration
Secure API access management
Enterprise-ready security controls

## Architechture:

![Image](https://github.com/user-attachments/assets/af381030-e6a5-42fa-b76c-7c5b839e0387)

## Design Workflow

### Sign-Up Flow:

User initiates sign-up through Amplify UI
Amplify sends a GET request to the API gateway
FileFetchLambda accesses ToS files from S3 bucket
API Gateway handles the ToS file delivery
RefererAuthorizer Lambda verifies access permissions of the request from Amplify
PreSignUp Lambda performs:
CAPTCHA verification with reCAPTCHA
ToS SHA verification with S3 bucket
Cognito creates user account after successful validation

### Sign-In Flow:

User attempts to sign in through Amplify interface
Cognito triggers custom authentication flow with three Lambda functions:
DefineAuthChallenge: Sets up authentication parameters
CreateAuthChallenge: Generates challenge parameters
VerifyAuthChallenge: Validates user response
DefineAuthChallenge Lambda defines the challenge parameters for SRP password verification and custom auth challenge for ToS Validation and Captcha.
CreateAuthChallenge Lambda fetches the challenge parameters for ToS and Captcha and returns to Amplify User Client
Amplify Client calls the confirm sign in API call to Congito
VerifyAuthChallenge Lambda receives the challenge response and Verifies the ToS SHA, Captcha Response Token.
The user gets signed in, on the Amplify Client.

### Security Components:

API Gateway manages secure API access
S3 buckets store ToS documents
Lambda functions handle various security checks
Cognito manages user pool and authentication
reCAPTCHA provides bot protection

### Integration Points:

Amplify UI ↔ Cognito for user management
Lambda ↔ S3 for ToS verification
Lambda ↔ reCAPTCHA for challenge verification
API Gateway ↔ Lambda for secure access


## Instructions to Launch:

CloudFormation Template: [auth-template.yaml](https://github.com/pranavsrinivasa/Secure-Sign-In-with-custom-authentication-for-Cognito/blob/master/auth-template.yaml)
- Step: 1 - Create your own google reCaptcha and find your site key and secret.
- Step: 2 - In the cloudformation template add the following parameters:
  - Add the reCaptcha Site Key and Secret Key
  - Github repo link. ( Fork the Repo: https://github.com/pranavsrinivasa/Secure-Sign-In-with-custom-authentication-for-Cognito into an account and use the github link of the forked repo. )
  - Create a Github Classic Personal Access Token and add the PAT key
  - Add a globally unique S3 bucket name
  ![Image](https://github.com/user-attachments/assets/bdaae330-d715-46b5-84b3-659a7096a589)

- Step: 3 - Deploy the template.
- Step: 4 - Check if all the resources are correct and deployed
- Step: 5 - Upload ToS files in the S3 bucket with the prefix key : bucket-name/tosfiles/test.txt ( To change the prefix, the environment variables of lambda functions and Amplify needs to updated )
  ![image](https://github.com/user-attachments/assets/c9f00db2-b36a-4e8d-9dbb-e4422e2c14ef)
  ![image](https://github.com/user-attachments/assets/aaa1b8b7-afa9-4b13-8df8-e6b4669a42db)
  ![image](https://github.com/user-attachments/assets/0a46e997-fc91-4c8b-898b-7a8eddaa9a1d)

- Step: 6 - Go to Amplify app and deploy the app
- Step: 7 - Put the domain of amplify in the google reCaptcha
- Step: 8 - Verify the working
