import datetime
import env
import stripe
import db
from fastapi import HTTPException, Request, Depends, APIRouter
from fastapi_jwt_auth2 import AuthJWT

# Create a router for Stripe endpoints
router = APIRouter(prefix="/api/stripe")

# Set your Stripe secret key
stripe.api_key = env.STRIPE_SECRET_KEY
endpoint_secret = env.STRIPE_WEBHOOK_SECRET


@router.post("/create-checkout-session")
async def create_checkout_session(request: Request, Authorize: AuthJWT = Depends()):
    try:
        Authorize.jwt_required()
        current_user = Authorize.get_jwt_subject()

        base_url = str(request.base_url).rstrip("/")
        return_url = f"{base_url}/basic/return?session_id={{CHECKOUT_SESSION_ID}}"

        session = stripe.checkout.Session.create(
            client_reference_id=current_user,
            # Fix: Use strings for keys and colons for dictionary mapping
            subscription_data={
                "metadata": {
                    "user_id": current_user,
                    "plan_type": "basic"
                },
            },
            line_items=[
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
            mode="subscription",
            ui_mode="embedded",
            return_url=return_url,
        )
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

    # Handle the event
    

    # if event["type"] == "checkout.session.completed":
    #     session = event["data"]["object"]
        
    #     # Fulfill the purchase...
    #     user_username = session.get("client_reference_id")
    #     if user_username:
    #         # Update the user's class in the database
    #         # db.setUserData(user_username, user_class="premium")
    #         print(f"User {user_username} upgraded to premium!")

    # return {"status": "success"}

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
            
            # Update the user's class to premium
            db.setUserData(user_id, user_class="premium")


    return {"status": "success"}



    # invoice.payment_failed
    # customer.subscription.deleted