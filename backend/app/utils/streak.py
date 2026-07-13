from datetime import datetime, timezone
from app.db import users_collection

def update_user_streak(user: dict) -> dict:
    email = user.get("email")
    if not email:
        return user
        
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    last_active_date = user.get("last_active_date", "")
    current_streak = user.get("current_streak", 0)
    max_streak = user.get("max_streak", 0)
    
    # Handle old streak format safely
    if "streak" in user and not last_active_date:
        current_streak = user.get("streak", 0)
        
    if last_active_date == today_str:
        # Already studied today, nothing changes
        pass 
    else:
        if not last_active_date:
            current_streak += 1 # Or just 1 if no previous streak
        else:
            try:
                last_date = datetime.strptime(last_active_date, "%Y-%m-%d")
                today_date = datetime.strptime(today_str, "%Y-%m-%d")
                delta = (today_date - last_date).days
                
                if delta == 0:
                    pass
                elif delta == 1:
                    current_streak += 1
                elif delta > 1:
                    current_streak = 1
            except ValueError:
                # Fallback if date is corrupted
                current_streak = 1
                
        if current_streak > max_streak:
            max_streak = current_streak
            
        user["last_active_date"] = today_str
        user["current_streak"] = current_streak
        user["max_streak"] = max_streak
        
        users_collection.update_one(
            {"email": email},
            {"$set": {
                "last_active_date": today_str,
                "current_streak": current_streak,
                "max_streak": max_streak,
                "streak": current_streak  # keep streak updated for backward compatibility
            }}
        )
        
    return user
