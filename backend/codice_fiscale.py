"""
Validation of the Italian tax code (codice fiscale).

A code looks like  RSSMRA85T10A562S  and contains:
  RSS MRA   letters taken from surname and name
  85        year of birth (last two digits)
  T         month of birth (letter)
  10        day of birth (+40 for women)
  A562      place of birth
  S         control character, computed from the other 15

We check: format, control character, and that date of birth and gender
match what is written in the code. We do NOT check surname/name letters
or the place (that would need the official municipality table).
"""
import datetime
import re

MONTH_LETTERS = "ABCDEHLMPR" + "ST"  # A=Jan B=Feb C=Mar D=Apr E=May H=Jun L=Jul M=Aug P=Sep R=Oct S=Nov T=Dec

# Homonymy ("omocodia"): when two people would get the same code, some digits
# are replaced by these letters (L=0, M=1, N=2, ... V=9).
OMOCODIA_LETTERS = "LMNPQRSTUV"

FORMAT = re.compile(
    r"^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$"
)

# Official tables for the control character
_ODD = {
    **dict(zip("0123456789", [1, 0, 5, 7, 9, 13, 15, 17, 19, 21])),
    **dict(zip("ABCDEFGHIJKLMNOPQRSTUVWXYZ",
               [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23])),
}
_EVEN = {
    **{str(d): d for d in range(10)},
    **{chr(ord("A") + i): i for i in range(26)},
}


def normalize(code: str) -> str:
    return code.strip().upper()


def control_char(first_15: str) -> str:
    total = 0
    for index, char in enumerate(first_15):
        # index 0 is position 1 (odd), index 1 is position 2 (even), ...
        total += _ODD[char] if index % 2 == 0 else _EVEN[char]
    return chr(ord("A") + total % 26)


def validate(code: str, birth_date: datetime.date, gender: str) -> str:
    """Returns the normalized code, or raises ValueError with an Italian message."""
    code = normalize(code)

    if not FORMAT.match(code):
        raise ValueError("Il codice fiscale non ha il formato corretto")

    if control_char(code[:15]) != code[15]:
        raise ValueError("Il codice fiscale non è valido (carattere di controllo errato)")

    # Turn the homonymy letters back into digits before reading the date
    chars = list(code)
    for position in (6, 7, 9, 10, 12, 13, 14):
        if chars[position] in OMOCODIA_LETTERS:
            chars[position] = str(OMOCODIA_LETTERS.index(chars[position]))

    year_2_digits = int("".join(chars[6:8]))
    month = MONTH_LETTERS.index(chars[8]) + 1
    day = int("".join(chars[9:11]))
    code_gender = "M"
    if day > 40:
        code_gender = "F"
        day -= 40

    if (birth_date.year % 100, birth_date.month, birth_date.day) != (year_2_digits, month, day):
        raise ValueError("Il codice fiscale non corrisponde alla data di nascita indicata")
    if code_gender != gender:
        raise ValueError("Il codice fiscale non corrisponde al sesso indicato")

    return code