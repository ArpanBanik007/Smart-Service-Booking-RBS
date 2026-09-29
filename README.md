# Near It... — Smart Service Booking Platform

> **“Service, by your side.”**

A full-stack service booking platform where users can discover nearby service providers, book services, make online payments, track providers in real time, and submit reviews.

---

## 🚀 Project Overview

**Near It...** connects customers with service providers.

### Basic Flow

```text
User
 ↓
Search Service
 ↓
Find Nearby Provider
 ↓
Select Service
 ↓
Choose Date + Time + Address
 ↓
Create Booking
 ↓
Razorpay Payment
 ↓
Payment Verification
 ↓
Booking Confirmed
 ↓
Provider Accepts
 ↓
Provider On The Way
 ↓
Live Location Tracking
 ↓
Service Started
 ↓
Service Completed
 ↓
Review & Rating
```

---

# 👥 User Roles

## 1. User

Users can:

* Register/Login
* Verify email with OTP
* Manage profile
* Add/manage addresses
* Search services
* Find nearby providers
* View provider profile
* Book services
* Pay using Razorpay
* Track booking status
* Track provider location
* Cancel/request refund where applicable
* Give rating and review

---

## 2. Provider

A normal user can request to become a provider.

```text
User
 ↓
Become Provider
 ↓
Submit Documents
 ↓
Admin Verification
 ↓
Approved
 ↓
Provider Access
```

Providers can:

* Create provider profile
* Add service area
* Set availability
* Add services
* Receive bookings
* Accept/Reject bookings
* Mark booking as On The Way
* Start service
* Complete service
* Share live location
* View earnings
* Manage reviews

> Provider access is controlled by the backend. A normal user cannot simply change their role from the frontend.

---

## 3. Admin

Admin can:

* View dashboard statistics
* Manage users
* Manage providers
* Verify provider applications
* Manage categories
* Manage services
* Monitor bookings
* Monitor payments
* Process refunds
* Manage reviews
* View platform analytics

---

# 🛠️ Tech Stack

## Frontend

```text
React
Vite
Tailwind CSS
React Router
Redux Toolkit
React Hook Form
Zod
Axios
React Icons
```

## Backend

```text
Node.js
Express.js
REST API
JWT
HTTP-only Cookies
```

## Database

```text
MongoDB Atlas
Mongoose
```

## Payment

```text
Razorpay
```

## Real-Time

```text
Socket.IO
```

## Maps

```text
Leaflet
OpenStreetMap
```

## File Storage

```text
Cloudinary
```

## Email

```text
Nodemailer
Brevo SMTP
```

---

# 📁 Main Project Structure

```text
Smart Service Booking
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── store/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   ├── app.js
│   └── index.js
│
└── README.md
```

---

# 🔗 API Base URL

Backend runs on:

```text
http://localhost:8000
```

All application APIs use:

```text
/api/v1
```

Therefore:

```text
http://localhost:8000/api/v1
```

---

# 🔐 Authentication APIs

Authentication uses **JWT + HTTP-only cookies**.

JWT tokens are **not stored in localStorage**.

## Send OTP

```http
POST /api/v1/users/sendOTP
```

Purpose:

```text
Send email verification OTP
```

---

## Verify OTP

```http
POST /api/v1/users/verifyOTP
```

Purpose:

```text
Verify user's email OTP
```

---

## Register

```http
POST /api/v1/users/register
```

Example data:

```json
{
  "fullName": "Arpan Banik",
  "email": "user@example.com",
  "phone": "9876543210",
  "username": "arpan",
  "password": "password",
  "otp": "123456"
}
```

Creates a normal:

```text
user
```

---

## Login

```http
POST /api/v1/users/login
```

Login can use:

```text
username
OR
email
```

Example:

```json
{
  "identifier": "arpan",
  "password": "password"
}
```

---

## Current User

```http
GET /api/v1/users/current-user
```

Purpose:

```text
Get currently authenticated user
```

---

## Refresh Token

```http
POST /api/v1/users/refresh-token
```

Purpose:

```text
Generate a new access token
```

Used automatically when the access token expires.

---

## Logout

```http
POST /api/v1/users/logout
```

Purpose:

```text
Clear authentication cookies
```

---

# 👤 User APIs

User-related functionality includes:

```text
Profile
Addresses
Bookings
Reviews
Notifications
```

Important endpoints:

```http
GET    /api/v1/users/current-user

GET    /api/v1/addresses
POST   /api/v1/addresses
PATCH  /api/v1/addresses/:id
DELETE /api/v1/addresses/:id

PATCH  /api/v1/addresses/:id/default
```

### Address API Usage

Address is used during booking.

```text
User
 ↓
Select Address
 ↓
Booking
 ↓
Provider receives service location
```

---

# 🧑‍🔧 Provider APIs

Base route:

```text
/api/v1/provider
```

Important endpoints:

```http
POST /api/v1/provider/become
GET  /api/v1/provider/me
PATCH /api/v1/provider/profile
PATCH /api/v1/provider/service-area
PATCH /api/v1/provider/availability
GET  /api/v1/provider/nearby
GET  /api/v1/provider/:providerId
```

### Provider Flow

```text
Normal User
 ↓
Become Provider
 ↓
Provider Application
 ↓
Admin Verification
 ↓
Approved
 ↓
Provider Dashboard
```

---

# 📄 Provider Verification APIs

Base route:

```text
/api/v1/provider-verification
```

Endpoints:

```http
POST /api/v1/provider-verification/submit
GET  /api/v1/provider-verification/me
POST /api/v1/provider-verification/resubmit
GET  /api/v1/provider-verification/pending
PATCH /api/v1/provider-verification/:id/approve
PATCH /api/v1/provider-verification/:id/reject
```

Purpose:

```text
Provider submits documents
        ↓
Admin reviews documents
        ↓
Approve / Reject
```

---

# 🗂️ Category APIs

Base route:

```text
/api/v1/catagory
```

Categories represent service types.

Example:

```text
Electrician
Plumber
AC Repair
Cleaning
Carpenter
Mechanic
```

Categories are used to organize services and make searching easier.

---

# 🛠️ Service APIs

Services represent the actual service offered by a provider.

Example:

```text
Category:
Electrician

Service:
Fan Installation

Price:
₹500
```

Basic concept:

```text
Category
   ↓
Provider
   ↓
Service
   ↓
Booking
```

---

# 📅 Booking APIs

Base route:

```text
/api/v1/bookings
```

Booking connects:

```text
User
+
Provider
+
Service
+
Address
+
Date/Time
+
Payment
```

### Booking Lifecycle

```text
PENDING
   ↓
ACCEPTED
   ↓
ON_THE_WAY
   ↓
STARTED
   ↓
COMPLETED
```

Possible rejection:

```text
PENDING
   ↓
REJECTED
```

Provider booking actions include:

```http
POST /api/v1/bookings/provider/:id/accept
POST /api/v1/bookings/provider/:id/reject
POST /api/v1/bookings/provider/:id/on-the-way
POST /api/v1/bookings/provider/:id/start
POST /api/v1/bookings/provider/:id/complete
```

---

# 💳 Razorpay Payment

Razorpay is used for online booking payments.

## Payment Flow

```text
User selects service
        ↓
Create Booking
        ↓
Backend calculates amount
        ↓
Backend creates Razorpay Order
        ↓
Frontend opens Razorpay Checkout
        ↓
User completes payment
        ↓
Razorpay returns payment details
        ↓
Backend verifies Razorpay signature
        ↓
Payment confirmed
        ↓
Booking confirmed
```

---

## Create Razorpay Order

```http
POST /api/v1/payments/create-order
```

The backend creates the Razorpay order.

The frontend should **not decide the final payable amount**.

---

## Verify Payment

```http
POST /api/v1/payments/verify
```

Backend verifies:

```text
razorpay_order_id
razorpay_payment_id
razorpay_signature
```

The signature must be verified on the backend.

---

## Get Booking Payment

```http
GET /api/v1/payments/booking/:bookingId
```

Used to retrieve payment information for a booking.

---

# 🔄 Refund APIs

Base route:

```text
/api/v1/refunds
```

Refund flow:

```text
Paid Booking
     ↓
Cancellation / Rejection
     ↓
Refund Request
     ↓
Backend Validation
     ↓
Razorpay Refund
     ↓
Refund Status Updated
```

Admin can also manage refund requests.

---

# 📍 Nearby Provider

Provider locations use geolocation.

Concept:

```text
User Location
     ↓
Latitude + Longitude
     ↓
MongoDB Geo Query
     ↓
Nearby Providers
     ↓
Show Providers on Map
```

MongoDB uses geospatial indexing for nearby-provider search.

---

# 🗺️ Map

Map functionality is used for:

```text
User Location
Provider Location
Nearby Providers
Service Address
Live Tracking
```

Current planned stack:

```text
Leaflet
+
OpenStreetMap
```

---

# ⚡ Socket.IO — Real-Time Features

Socket.IO is used when data needs to update without refreshing the page.

Main uses:

```text
Provider Live Location
Booking Status
Notifications
```

Example:

```text
Provider
   ↓
GPS Location
   ↓
Socket.IO
   ↓
Server
   ↓
Customer
   ↓
Live Map
```

---

# ☁️ Cloudinary

Cloudinary handles image/file storage.

Used for:

```text
Profile Images
Service Images
Provider Documents
```

Instead of storing large files directly inside MongoDB.

---

# 📧 Email / OTP

Email functionality uses:

```text
Nodemailer
+
Brevo SMTP
```

Used for:

```text
Email OTP
Email Verification
Booking Confirmation
Payment-related Emails
```

OTP flow:

```text
User enters email
       ↓
POST /sendOTP
       ↓
Backend generates OTP
       ↓
Email sent
       ↓
User enters OTP
       ↓
POST /verifyOTP
       ↓
Email verified
```

---

# ⭐ Reviews

Review system is connected to completed bookings.

Flow:

```text
Booking
   ↓
Service Completed
   ↓
User can review
   ↓
Rating + Comment
   ↓
Provider Rating Updated
```

Base route:

```text
/api/v1/reviews
```

A user should not be able to review a service that they have not completed.

---

# 🔔 Notifications

Base route:

```text
/api/v1/notifications
```

Notifications can be generated for events such as:

```text
Booking Created
Booking Accepted
Booking Rejected
Provider On The Way
Service Started
Service Completed
Payment
Refund
```

---

# 👨‍💼 Admin APIs

Base route:

```text
/api/v1/admin
```

Admin functionality includes:

```text
Users
Providers
Provider Verification
Categories
Services
Bookings
Payments
Refunds
Reviews
Dashboard Statistics
```

Admin APIs are protected using:

```text
JWT Authentication
+
Role-Based Access Control
```

---

# 🔒 Security

The application follows these security principles:

```text
JWT Authentication
HTTP-only Cookies
Refresh Token
Password Hashing
Role-Based Access Control
Input Validation
CORS
Rate Limiting
Security Headers
File Validation
Environment Variables
Razorpay Signature Verification
```

### Important

Never store JWT tokens in:

```text
localStorage
sessionStorage
```

Authentication cookies are HTTP-only.

---

# 🧠 API Architecture

Frontend:

```text
React
 ↓
Axios
 ↓
API Endpoint
 ↓
Express Route
 ↓
Middleware
 ↓
Controller
 ↓
Service
 ↓
Model
 ↓
MongoDB
```

Example:

```text
Login Button
     ↓
authApi.login()
     ↓
Axios
     ↓
POST /users/login
     ↓
auth Route
     ↓
verify / validation
     ↓
userController
     ↓
User Model
     ↓
MongoDB
     ↓
JWT Cookie
     ↓
Frontend
```

---

# 🔄 Authentication Architecture

```text
Login
  ↓
Backend verifies credentials
  ↓
JWT generated
  ↓
HTTP-only Cookie
  ↓
Protected API
  ↓
JWT Middleware
  ↓
User ID + Role
  ↓
Controller
```

For admin:

```text
Request
 ↓
JWT valid?
 ↓
Role = admin?
 ↓
YES → Continue
NO  → 403 Forbidden
```

---

# 💻 Environment Variables

Backend `.env` contains sensitive configuration such as:

```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string

ACCESS_TOKEN_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_secret

RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

BREVO_SMTP_USER=your_smtp_user
BREVO_SMTP_PASS=your_smtp_password
BREVO_SENDER_EMAIL=your_email
```

Never commit `.env` to GitHub.

---

# ▶️ Run Locally

## Backend

```bash
cd backend
npm install
npm run dev
```

Backend:

```text
http://localhost:8000
```

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# 🧪 Testing

Frontend:

```bash
npm run lint
npm run build
```

Backend API testing can be done using:

```text
Postman
Thunder Client
Supertest
```

---

# 📊 Main Database Models

```text
User
Provider
ProviderVerification
Category
Service
Address
Booking
BookingStatusHistory
Payment
Transaction
Refund
Review
Notification
EmailVerification
PaymentWebhookEvent
```

### Relationship

```text
User
 ├── Addresses
 ├── Bookings
 ├── Reviews
 └── Notifications

User
 └── Provider
      ├── Services
      ├── Service Area
      ├── Availability
      └── Bookings

Booking
 ├── Payment
 ├── Refund
 ├── Review
 └── Status History
```

---

# 🏗️ Development Order

The project is developed in phases:

```text
1. Authentication
      ↓
2. Profile + Address
      ↓
3. Provider Discovery + Map
      ↓
4. Services
      ↓
5. Booking
      ↓
6. Razorpay Payment
      ↓
7. Booking Status
      ↓
8. Socket.IO + Live Tracking
      ↓
9. Notifications + Reviews
      ↓
10. Provider Dashboard
      ↓
11. Admin Dashboard
      ↓
12. Security + Testing
      ↓
13. Deployment
```

---

# 🌐 Deployment Architecture

```text
                 GitHub
                    │
                    ↓
                Frontend
                    │
                    ↓
                 Vercel
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
   MongoDB      Cloudinary   Razorpay
    Atlas
        │
        ↓
    Database
```

Socket.IO deployment should use a hosting setup that supports persistent WebSocket connections.

---

# 🎯 Core Features

* ✅ JWT Authentication
* ✅ HTTP-only Cookie Authentication
* ✅ Email OTP Verification
* ✅ Role-Based Access Control
* ✅ User Management
* ✅ Provider Registration
* ✅ Provider Verification
* ✅ Service Management
* ✅ Address Management
* ✅ Nearby Provider Search
* ✅ Map Integration
* ✅ Booking System
* ✅ Razorpay Payment
* ✅ Payment Verification
* ✅ Refund System
* ✅ Booking Status Tracking
* ✅ Socket.IO Real-Time Updates
* ✅ Live Provider Location
* ✅ Notifications
* ✅ Reviews & Ratings
* ✅ Provider Dashboard
* ✅ Admin Dashboard

---

# 📌 Project Goal

The goal of **Near It...** is to build a production-style service marketplace rather than a simple CRUD application.

It demonstrates practical full-stack concepts including:

```text
Authentication
Authorization
REST APIs
MongoDB
Payments
Geolocation
Real-Time Communication
File Upload
Email Verification
Role-Based Systems
Booking Management
Financial Transactions
Admin Management
```

---

## 👨‍💻 Developer

**Arpan Banik**

B.Tech ECE — 2027

Full-Stack / MERN Developer

GitHub:
https://github.com/ArpanBanik007
