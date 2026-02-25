import datetime
import env
import stripe
import db
from fastapi import HTTPException, Request, Depends, APIRouter
from fastapi_jwt_auth2 import AuthJWT

# Create a router for Stripe endpoints
# router = APIRouter(prefix="/api/stripe")
router = APIRouter(prefix="/api/stripe")


# Set your Stripe secret key
stripe.api_key = env.STRIPE_SECRET_KEY
endpoint_secret = env.STRIPE_WEBHOOK_SECRET


@router.post("/create-checkout-session")
async def create_checkout_session(request: Request, Authorize: AuthJWT = Depends()):
    try:
        Authorize.jwt_required()
        current_user = Authorize.get_jwt_subject()

        # 1. Check if we already have a Stripe Customer ID for this user
        stripe_customer_id = db.getStripeCustomerId(current_user)

        base_url = str(request.base_url).rstrip("/")
        return_url = f"{base_url}/basic/return?session_id={{CHECKOUT_SESSION_ID}}"

        # 2. Build session arguments
        session_args = {
            "client_reference_id": current_user,
            "subscription_data": {
                "metadata": {
                    "user_id": current_user,
                    "plan_type": "basic"
                },
            },
            "line_items": [
                {
                    "price_data": {
                        "currency": "eur",
                        "product_data": {"name": "Basic Plan"},
                        "unit_amount": 999,
                        "recurring": {"interval": "month"},
                    },
                    "quantity": 1,
                }
            ],
            "mode": "subscription",
            "ui_mode": "embedded",
            "return_url": return_url,
        }

        # 3. If the customer exists, attach their ID to the session
        if stripe_customer_id:
            session_args["customer"] = stripe_customer_id
        else:
            # Pre-fill email for new customers
            email = db.getEmail(current_user)
            if email:
                session_args["customer_email"] = email

        session = stripe.checkout.Session.create(**session_args)
        return {"clientSecret": session.client_secret}
    except Exception as e:
        # It is helpful to print the error to your server logs for debugging
        print(f"Stripe Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/session_status")
async def session_status(session_id: str):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return {
            "status": session.status,
            "customer_email": session.customer_details.email if session.customer_details else None
            # TODO: check if user is premium
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    event = None

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    db.dumpStripeEvent(event["id"], event) 
    
    print('STRIPE EVENT TYPE: ', event["type"])


    if event["type"] == "invoice.paid":
        invoice = event["data"]["object"]
        
        # Use .get() chains to prevent "KeyError" if Stripe changes things
        parent = invoice.get("parent", {})
        sub_details = parent.get("subscription_details", {})
        metadata = sub_details.get("metadata", {})
    
        user_id = metadata.get("user_id")
        customer = invoice.get("customer")
        date = invoice.get("period_start")
        class_type = metadata.get("plan_type")
        event_id = event.get("id")
        invoice_created = invoice.get("created")
    
        if user_id:
            print(f"Success! Found metadata for user: {user_id}")
            print(f"Customer: {customer}")
            print(f"Date: {date}")
            print(f"Class type: {class_type}")
            print(f"Event ID: {event_id}")
            print(f"Invoice Created: {invoice_created}")
            
            # Log the event to the database with the Stripe timestamp
            db.addStripeEvent(user_id, customer, class_type, event_id, invoice_created)
            
            # Update the user's class (e.g. to premium)
            db.updateUserClass(user_id, class_type)


    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        metadata = subscription.get("metadata", {})
        user_id = metadata.get("user_id")
        customer = subscription.get("customer")
        event_id = event.get("id")
        created = event.get("created")


        if user_id:
            print(f"Subscription deleted for user: {user_id}")
            # Log the cancellation
            db.addStripeEvent(user_id, customer, "cancelled", event_id, created)
            # Revert the user's class (e.g. to empty/basic)
            db.updateUserClass(user_id, "")

            # TODO later cleanup routines

    return {"status": "success"}


@router.post("/create-portal-session")
async def create_portal_session(request: Request, Authorize: AuthJWT = Depends()):
    try:
        Authorize.jwt_required()
        current_user = Authorize.get_jwt_subject()
        
        stripe_customer_id = db.getStripeCustomerId(current_user)
        if not stripe_customer_id:
            raise HTTPException(status_code=400, detail="Stripe customer not found")

        base_url = str(request.base_url).rstrip("/")
        # Return to the user settings or profile page
        return_url = f"{base_url}/user/{current_user}" 

        session = stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url=return_url,
        )
        return {"url": session.url}
    except Exception as e:
        print(f"Stripe Portal Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))



    # invoice.payment_failed
    # customer.subscription.deleted