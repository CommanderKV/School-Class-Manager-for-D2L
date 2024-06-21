"""
# Description:
    This module contains the custom print function.
    
## Functions:
    - checkFor(item: str, text: str) -> bool: 
        This function checks for the presence of a string in another string.
    - print(*args, **kwargs): 
        This function is used to print the data with rich.
"""
import os
import re as Regex
from dotenv import load_dotenv
from rich import print as richPrint  # pylint: disable=redefined-builtin

def checkFor(item: str, text: str) -> bool:
    """
    # Description:
        This function checks for the presence of a string in another string.
    """
    if Regex.search(rf"^[\t\n ]*{item}", text.lower()):
        return True
    return False

def print(*args, **kwargs): # pylint: disable=redefined-builtin
    """
    # Description:
        This function is used to print the data with rich.
    """
    toPrint: str = str(args[0])
    if DEBUG or checkFor(r"\[ignore\]", toPrint):
        original: str = toPrint
        # Check for notice
        if checkFor(r"\[notice\]", original):
            toPrint = f"[bold]{toPrint}"

        # Check for warning
        if checkFor(r"[\\t]\[warning\]", original):
            toPrint = f"[bold yellow]{toPrint}"

        # Check for error
        if checkFor(r"\[error\]", original):
            toPrint = f"[bold underline red]{toPrint}"

        # Check for success
        if checkFor(r"\[success\]", original) or \
           checkFor(r"\[completed\]", original) or \
           checkFor(r"\[done\]", original) or \
           checkFor(r"\[saved\]", original) or \
           checkFor(r"\[loaded\]", original) or \
           checkFor(r"\[found\]", original) or \
           checkFor(r"\[obtained\]", original) \
        : # pylint: disable=too-many-boolean-expressions
            toPrint = f"[bold green]{toPrint}"

        # Set the args to the new value
        args = (toPrint,)

        return richPrint(*args, **kwargs)

    else:
        return None

# Check if the debugging is enabled
DEBUG: bool = False
if os.path.exists(".env"):
    load_dotenv(dotenv_path=".env")
    if os.getenv("SCRAPER_DEBUG") == "True":
        DEBUG = True
        print("[Success] Custom print function debugging enabled!")
        print("[Success] Environment variable \"SCRAPER_DEBUG=True\" enabled!")

# Check if the debugging is enabled
if not DEBUG:
    # Inform the user that debugging is disabled
    print("[Notice] Custom print function debugging disabled")
    print("[Notice] Environment variable \"SCRAPER_DEBUG\" not set or set to \"False\"")
    print("[Notice] To enable debugging, set the environment variable \"SCRAPER_DEBUG=True\" in .env") # pylint: disable=line-too-long
