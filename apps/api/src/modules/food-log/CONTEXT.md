# Food log

A user's record of food consumed, grouped into meals on today or a past date. Planned consumption and manually defined foods are outside this context.

## Language

**Food entry**:
A record of consuming a positive amount of a catalog product in a meal on a particular date, expressed in grams or millilitres. Each addition is a separate entry, even for the same product; entries can be corrected or deleted.
_Avoid_: Food assignment

**Meal slot**:
One of Breakfast, Lunch, Dinner, or Snacks used to group a user's food entries for a date.

**Logging destination**:
The meal slot and log date selected for new food entries. Changing this destination does not move entries already added.

**Logged unit**:
The user's choice of grams or millilitres for a food entry. This choice declares the catalog nutrition values to be per 100 of that unit; it does not convert weight to volume or volume to weight.

**Entry nutrition**:
The product nutrition captured when logging, multiplied by the consumed amount divided by 100, using the basis declared by the logged unit. Later catalog changes do not change an entry's captured product name or nutrition.

**Log date**:
The calendar date on which the user records consuming food, without conversion to UTC. It cannot be later than today according to the user's device-local date.
