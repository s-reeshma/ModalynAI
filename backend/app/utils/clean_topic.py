import re

def normalize_topic(raw_topic: str) -> str:
    """Cleans user input to ensure consistent cache keys."""
    if not raw_topic:
        return ""
        
    # 1. Convert to lowercase and strip extra outer spaces
    cleaned = raw_topic.lower().strip()
    
    # 2. Define conversational filler phrases to remove
    # The ^ symbol means "at the start of the string"
    fillers = [
        r"^teach me about ",
        r"^teach me ",
        r"^teach ",
        r"^explain ",
        r"^what is ",
        r"^tell me about "
    ]
    
    # 3. Strip the fillers using regex
    for filler in fillers:
        cleaned = re.sub(filler, "", cleaned)
        
    # 4. Final trim in case removing words left a hanging space
    return cleaned.strip()