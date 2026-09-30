import type { ListingStep } from "@/features/catalog/components/listing-form/steps";

/**
 * What each kind of stay is told on each step of its form, in its own words —
 * the mirror of FOOD_WORDS. Only the wording changes — the fields on a step
 * are the same for every kind — so a hotel, a hostel and a homestay each read
 * a form written for them, and a stay that changes its type keeps everything.
 *
 * Step ids: type, about, location, facilities, photos, rooms, rules, policies,
 * review. Three of them — facilities, rooms, rules — also take each kind's own
 * title.
 */

type StepWords = Partial<Pick<ListingStep, "title" | "question" | "description" | "tip">> & {
  /** Headings inside the step in this kind's words, by the first field of the group they head. */
  readonly groupTitles?: Readonly<Record<string, string>>;
};

const published = (noun: string): StepWords => ({
  description: `Check what is still missing, then choose whether guests can see the ${noun} yet.`,
  tip: {
    title: "Nothing here is final",
    body: `A published ${noun} appears on the website straight away. A draft stays here until it is published, and either can be changed later.`,
  },
});

export const STAY_WORDS: Readonly<Record<string, Readonly<Record<string, StepWords>>>> = {
  HOTEL: {
    type: {
      description: "A hotel: the form asks about its front desk, its rooms and its star rating.",
      tip: {
        title: "A hotel",
        body: "Rooms off a reception that is staffed every day, usually with a star rating from the Ministry of Tourism. Put the stars only if the rating is official.",
      },
    },
    about: {
      question: "What's the hotel called, and what's it like?",
      description: "Its name, one line that sells it, and the story of the hotel.",
      tip: {
        title: "Lead with what guests come for",
        body: "“Five minutes' walk to the Royal Palace, with a rooftop pool” tells a guest more than “Comfortable rooms and friendly staff”.",
      },
    },
    location: {
      question: "Where is the hotel, and how do guests reach the desk?",
      description: "Pin it on the map, and add the front desk's phone and the chat apps guests book on.",
      tip: {
        title: "The pin puts it on the website",
        body: "Guests see this hotel on the page of every destination within 50 km of its pin — a hotel in Siem Reap on Angkor Wat's page, say.",
      },
    },
    facilities: {
      title: "Hotel facilities",
      question: "What does the hotel offer?",
      description: "What kind of hotel it is, its desk and its events, then everything a guest can use, breakfast and parking.",
      groupTitles: { breakfastOption: "Breakfast at the hotel", parkingOption: "Hotel parking" },
      tip: {
        title: "Only list what is there",
        body: "A guest who books for the pool or the airport shuttle expects to find it. Leave out anything seasonal, or anything only arranged on request.",
      },
    },
    photos: {
      question: "Show the hotel at its best",
      description: "The cover leads every card and the top of its page: the building, the pool, or the best room.",
      tip: {
        title: "What makes a great cover",
        body: "The front of the hotel or its pool in daylight, straight and bright. No logos, text or collages. 1600 × 900 pixels or larger stays sharp everywhere.",
      },
    },
    rooms: {
      title: "Rooms",
      question: "Which rooms can guests book?",
      description: "Add each kind of room once: how many there are, who sleeps in which beds, what it has, and what a night costs.",
      tip: {
        title: "One entry per kind of room",
        body: "Twenty identical Deluxe doubles are one room, with 20 in “How many rooms like this”. Copy a room to make the next one like it. The cheapest bookable room sets the “From” price.",
      },
    },
    rules: {
      title: "Hotel rules",
      question: "What are the hotel's rules?",
      description: "When guests can check in and must check out, and what they may bring and do.",
      groupTitles: { minCheckInAge: "Who can check in", petsPolicy: "Pets, smoking and parties" },
      tip: {
        title: "Rules that avoid surprises",
        body: "Clear check-in times and a pets and smoking rule answer the questions guests otherwise send the desk. Leave “Latest check-in” empty if the desk is open all night.",
      },
    },
    policies: {
      question: "What does a night cost, and how can guests pay?",
      description: "The price guests see first, the cards and apps the desk takes, and the languages it speaks.",
      tip: {
        title: "Show the lowest honest price",
        body: "“From” is one night in the cheapest room, taxes included — a price a guest can really book. Travellers from abroad look for Visa and Mastercard; most guests here pay with KHQR.",
      },
    },
    review: published("hotel"),
  },

  GUESTHOUSE: {
    type: {
      description: "A guesthouse: the form asks about the house, its hosts and what they can arrange.",
      tip: {
        title: "A guesthouse",
        body: "A few rooms in a house run by the people who own it, usually without a star rating. If the family lives with the guests and shares meals, Homestay fits better.",
      },
    },
    about: {
      question: "What's the guesthouse called, and what's it like?",
      description: "Its name, one line that sells it, and who runs it.",
      tip: {
        title: "Lead with the hosts",
        body: "Guests choose a guesthouse for the people. “Run by Srey and her family, who know every tuk-tuk driver in town” sells more than a list of rooms.",
      },
    },
    location: {
      question: "Where is the guesthouse, and how do guests reach the hosts?",
      description: "Pin it on the map, and add the hosts' phone and the chat apps they answer.",
      tip: {
        title: "Down a small street?",
        body: "Guests see this guesthouse on the page of every destination within 50 km of its pin. Put the pin on the gate, not the main road — tuk-tuk drivers follow it.",
      },
    },
    facilities: {
      title: "The guesthouse",
      question: "What does the guesthouse offer?",
      description: "The house, what the hosts can arrange, what guests can use, breakfast and parking.",
      groupTitles: { breakfastOption: "Breakfast at the guesthouse", parkingOption: "Parking" },
      tip: {
        title: "What the hosts do counts",
        body: "Bus tickets, a tuk-tuk for the day or a visa extension are why many guests pick a guesthouse. Tick only what the hosts really arrange.",
      },
    },
    photos: {
      question: "Show the guesthouse at its best",
      description: "The cover leads every card and the top of its page: the house, its garden, or a room.",
      tip: {
        title: "What makes a great cover",
        body: "The front of the house or the garden in daylight — the place a guest will recognise when they arrive. No logos, text or collages.",
      },
    },
    rooms: {
      title: "Rooms",
      question: "Which rooms can guests book?",
      description: "Add each kind of room once: fan or air-con, shared or private bathroom, the beds and a night's price.",
      tip: {
        title: "Fan and air-con are two rooms",
        body: "A fan room and an air-con room at different prices are two entries, so guests can choose. Copy one to make the other. The cheapest bookable room sets the “From” price.",
      },
    },
    rules: {
      title: "House rules",
      question: "What are the house rules?",
      description: "When guests can arrive and must leave, and what they may bring and do in the house.",
      groupTitles: { minCheckInAge: "Who can stay", petsPolicy: "Pets, smoking and parties", quietHours: "When the house is quiet" },
      tip: {
        title: "Say when the gate closes",
        body: "Many guesthouses lock the gate at night. Put that hour in “Latest check-in” so a late bus does not leave a guest outside.",
      },
    },
    policies: {
      question: "What does a night cost, and how can guests pay?",
      description: "The price guests see first, how they can pay the hosts, and the languages the hosts speak.",
      tip: {
        title: "Cash is fine — say so",
        body: "Many guesthouses take cash and KHQR only. Saying it up front saves a guest a trip to the ATM. “From” follows the cheapest room by itself once rooms have prices.",
      },
    },
    review: published("guesthouse"),
  },

  HOSTEL: {
    type: {
      description: "A hostel: the form asks about its dorms, its beds and its social life.",
      tip: {
        title: "A hostel",
        body: "Beds sold one by one in shared dorms, often with a few private rooms. Hostels are not star-rated, so the form does not ask for stars.",
      },
    },
    about: {
      question: "What's the hostel called, and what's it like?",
      description: "Its name, one line that sells it, and what kind of crowd it draws.",
      tip: {
        title: "Party or quiet — say which",
        body: "Backpackers pick a hostel for its mood. “Rooftop bar, pub crawl every night” and “Quiet dorms, free walking tour at nine” suit different guests — both do well when they are honest.",
      },
    },
    location: {
      question: "Where is the hostel, and how do guests reach reception?",
      description: "Pin it on the map, and add reception's phone and the chat apps backpackers use.",
      tip: {
        title: "Near the buses helps",
        body: "Guests see this hostel on the page of every destination within 50 km of its pin. Backpackers arrive by bus with a bag on their back, so the pin must be exact.",
      },
    },
    facilities: {
      title: "The hostel",
      question: "What does the hostel offer?",
      description: "The kinds of dorm, the social life and what backpackers need, then what guests can use, breakfast and parking.",
      groupTitles: { breakfastOption: "Breakfast at the hostel", parkingOption: "Parking for bikes and cars" },
      tip: {
        title: "Female dorms and lockers sell beds",
        body: "Solo travellers filter by female-only dorms, pod beds and a kitchen. Tick them only when every guest can have them.",
      },
    },
    photos: {
      question: "Show the hostel at its best",
      description: "The cover leads every card and the top of its page: the common room, the bar or a dorm.",
      tip: {
        title: "Show where people meet",
        body: "The rooftop, the bar or the common room with people in it sells a hostel better than an empty dorm. No logos, text or collages.",
      },
    },
    rooms: {
      title: "Dorms & rooms",
      question: "Which dorms and rooms can guests book?",
      description: "Add each dorm once with how many beds it has, then any private rooms: the beds, the lockers, and a night's price.",
      tip: {
        title: "A dorm is one entry",
        body: "An 8-bed mixed dorm is one entry with 8 beds; guests book one bed. A female-only dorm is a separate entry. The cheapest bed sets the “From” price.",
      },
    },
    rules: {
      title: "Hostel rules",
      question: "What are the hostel's rules?",
      description: "When guests can check in and must leave, the age limit, and the rules of the dorms.",
      groupTitles: { minCheckInAge: "Age and children", petsPolicy: "Pets, smoking and parties", quietHours: "Quiet hours in the dorms" },
      tip: {
        title: "Age limits go here",
        body: "If the dorms are for adults only, put the youngest age in “Youngest guest”. Dorm quiet hours stop the most common complaint.",
      },
    },
    policies: {
      question: "What does a bed cost, and how can guests pay?",
      description: "The price of the cheapest bed, how guests can pay, and the languages reception speaks.",
      tip: {
        title: "The price of one bed",
        body: "“From” is one bed for one night in the cheapest dorm — the figure backpackers compare. It follows the cheapest bed by itself once the dorms have prices.",
      },
    },
    review: published("hostel"),
  },

  RESORT: {
    type: {
      description: "A resort: the form asks about its setting, its meal plans and what there is to do.",
      tip: {
        title: "A resort",
        body: "A place guests stay inside for most of the day — by the sea, on an island or in the jungle — with its own restaurant, pool and activities.",
      },
    },
    about: {
      question: "What's the resort called, and what's it like?",
      description: "Its name, one line that sells it, and what a day there is like.",
      tip: {
        title: "Sell the setting",
        body: "“Bungalows on a white-sand beach on Koh Rong Samloem, twenty minutes by boat” tells a guest why to come. Leave the list of facilities to the next steps.",
      },
    },
    location: {
      question: "Where is the resort, and how do guests get there?",
      description: "Pin it on the map, and add the reservations phone and the chat apps guests book on.",
      tip: {
        title: "An island counts too",
        body: "Guests see this resort on the page of every destination within 50 km of its pin. On an island, pin the resort itself, not the pier.",
      },
    },
    facilities: {
      title: "Resort facilities",
      question: "What does the resort offer?",
      description: "Its setting, meal plans, activities and transfer, then everything a guest can use, breakfast and parking.",
      groupTitles: { breakfastOption: "Breakfast at the resort", parkingOption: "Resort parking" },
      tip: {
        title: "Say what is included",
        body: "A guest comparing resorts looks for the meal plan and the transfer first. Tick all-inclusive only when drinks are included too.",
      },
    },
    photos: {
      question: "Show the resort at its best",
      description: "The cover leads every card and the top of its page: the beach, the pool or the view.",
      tip: {
        title: "What makes a great cover",
        body: "The setting in daylight — the beach from the bungalows, or the pool with the jungle behind. No logos, text or collages.",
      },
    },
    rooms: {
      title: "Rooms & villas",
      question: "Which rooms and villas can guests book?",
      description: "Add each kind of room, bungalow or villa once: the beds, what it has, and what a night costs.",
      tip: {
        title: "Bungalows and villas are rooms too",
        body: "A beach bungalow and a garden bungalow are two entries. Start from the Pool villa template for a villa with its own pool. The cheapest bookable one sets the “From” price.",
      },
    },
    rules: {
      title: "Resort rules",
      question: "What are the resort's rules?",
      description: "When guests can check in and must leave, and what they may bring and do.",
      groupTitles: { minCheckInAge: "Who can check in", petsPolicy: "Pets, smoking and parties" },
      tip: {
        title: "Match check-in to the boats",
        body: "If guests arrive on the afternoon boat, say so in the check-in times. A resort that takes children should say so — families filter by it.",
      },
    },
    policies: {
      question: "What does a night cost, and how can guests pay?",
      description: "The price guests see first, the ways they can pay, and the languages the staff speak.",
      tip: {
        title: "Show the lowest honest price",
        body: "“From” is one night in the cheapest room or bungalow, taxes included. Guests from abroad pay by card, so list the cards the resort takes.",
      },
    },
    review: published("resort"),
  },

  HOMESTAY: {
    type: {
      description: "A homestay: the form asks about the home, the family and what guests can join in.",
      tip: {
        title: "A homestay",
        body: "Guests sleep in a family's home and share its meals and days. Homestays are not star-rated, so the form does not ask for stars.",
      },
    },
    about: {
      question: "What's the homestay called, and what's life there like?",
      description: "Its name, one line that sells it, and the family guests will live with.",
      tip: {
        title: "Introduce the family",
        body: "“Stay with Mr Sok's family in their stilt house, cook dinner together and cycle to the temple at dawn” is why a traveller chooses a homestay.",
      },
    },
    location: {
      question: "Where is the home, and how do guests reach the family?",
      description: "Pin the house on the map, and add the family's phone or the chat app they answer.",
      tip: {
        title: "Villages have no street numbers",
        body: "Guests see this homestay on the page of every destination within 50 km of its pin. Write the village and commune in the address, and pin the house itself.",
      },
    },
    facilities: {
      title: "The home",
      question: "What is the home like, and what can guests join in?",
      description: "The house, what guests can take part in, what the home has, breakfast and parking.",
      groupTitles: { breakfastOption: "Breakfast with the family", parkingOption: "Parking at the house" },
      tip: {
        title: "The family is the facility",
        body: "Cooking with the hosts or an ox-cart ride is what guests remember. Tick only what the family really does with guests.",
      },
    },
    photos: {
      question: "Show the home and the family",
      description: "The cover leads every card and the top of its page: the house, the village or the family.",
      tip: {
        title: "Show real life",
        body: "The house with the rice fields behind it, or the family cooking — ask them first. No logos, text or collages.",
      },
    },
    rooms: {
      title: "Rooms in the home",
      question: "Where do guests sleep?",
      description: "Add each room guests can have once: the beds, the mosquito net or fan, the bathroom, and a night's price.",
      tip: {
        title: "Say what the bathroom is",
        body: "A shared bathroom behind the house is fine when guests know before they come. Say whether the room has a fan, a net and hot water. The cheapest room sets the “From” price.",
      },
    },
    rules: {
      title: "Living with the family",
      question: "What should guests know about living with the family?",
      description: "When guests can arrive and leave, and the rules of the home.",
      groupTitles: { checkInFrom: "Arriving", checkOutFrom: "Leaving", minCheckInAge: "Who can stay", petsPolicy: "Pets, smoking and parties", quietHours: "When the family sleeps" },
      tip: {
        title: "Village life starts early",
        body: "If the family goes to bed at nine and rises at five, say so in the quiet hours. Guests who know are happy guests.",
      },
    },
    policies: {
      question: "What does a night cost, and how can guests pay the family?",
      description: "The price guests see first, how they can pay the family, and the languages the family speaks.",
      tip: {
        title: "Say what the price includes",
        body: "Whether dinner with the family is in the price matters more than anything else here. Most families take cash or KHQR only.",
      },
    },
    review: published("homestay"),
  },

  VILLA: {
    type: {
      description: "A villa: the form asks about the villa itself, its staff and where it is.",
      tip: {
        title: "A villa",
        body: "A whole house guests have to themselves, usually with its own pool or garden. Villas are not star-rated, so the form does not ask for stars.",
      },
    },
    about: {
      question: "What's the villa called, and what's it like?",
      description: "Its name, one line that sells it, and what a stay there is like.",
      tip: {
        title: "Lead with the privacy",
        body: "“Three bedrooms, a private pool and a chef who cooks Khmer dinner” tells a family or a group of friends what they are booking.",
      },
    },
    location: {
      question: "Where is the villa, and who do guests call?",
      description: "Pin it on the map, and add the villa manager's phone and the chat apps they answer.",
      tip: {
        title: "Pin the gate",
        body: "Guests see this villa on the page of every destination within 50 km of its pin. Many arrive at night by taxi — pin the gate, not the road.",
      },
    },
    facilities: {
      title: "The villa",
      question: "What comes with the villa?",
      description: "The villa itself, its staff and where it is, then everything guests can use, breakfast and parking.",
      groupTitles: { breakfastOption: "Breakfast in the villa", parkingOption: "Parking at the villa" },
      tip: {
        title: "Say who looks after it",
        body: "A housekeeper, a chef or a night guard changes what a villa is worth. Tick only the staff who are there during every stay.",
      },
    },
    photos: {
      question: "Show the villa at its best",
      description: "The cover leads every card and the top of its page: the pool, the garden or the living room.",
      tip: {
        title: "What makes a great cover",
        body: "The pool with the villa behind it, in daylight. No logos, text or collages. 1600 × 900 pixels or larger stays sharp everywhere.",
      },
    },
    rooms: {
      title: "The villa & its bedrooms",
      question: "How do guests book the villa?",
      description: "Add the whole villa as one entry — its bedrooms, beds and a night's price — or each bedroom if they are let one by one.",
      tip: {
        title: "Usually one entry",
        body: "A villa let as a whole is one entry: start from “The whole villa” and set its bedrooms and bathrooms. Its price is the “From” price guests see.",
      },
    },
    rules: {
      title: "Villa rules",
      question: "What are the villa's rules?",
      description: "When guests can arrive and must leave, and what they may do in the villa.",
      groupTitles: { checkInFrom: "Arriving", checkOutFrom: "Leaving", minCheckInAge: "Who can book", petsPolicy: "Pets, smoking and parties", quietHours: "Quiet for the neighbours" },
      tip: {
        title: "Parties decide it",
        body: "Groups ask first whether they can hold a party. Answer it here, and give quiet hours if there are neighbours.",
      },
    },
    policies: {
      question: "What does a night in the villa cost, and how can guests pay?",
      description: "The price of the villa for a night, the ways guests can pay, and the languages the manager speaks.",
      tip: {
        title: "The price of the villa",
        body: "“From” is one night for the whole villa, not per person. It follows the villa's price by itself once it is set on the entry.",
      },
    },
    review: published("villa"),
  },

  OTHER: {
    type: {
      description: "Any other kind of stay — a camp, a bungalow, a boat: the form keeps to what every stay has.",
      tip: {
        title: "When nothing else fits",
        body: "Choose Other only when none of the kinds fits. A place with a few rooms run by its owners is a guesthouse; a whole house to rent is a villa.",
      },
    },
    about: {
      question: "What's the stay called, and what's it like?",
      description: "A name, a line that sells it, and the full story.",
      tip: {
        title: "Say what kind of place it is",
        body: "Guests cannot see a type for it, so say it in the first line: “Floating bungalows on the Tatai river”.",
      },
    },
    location: {
      question: "Where is it, and how do guests get in touch?",
      description: "Pin the stay on the map and add the ways to reach it.",
      tip: {
        title: "The pin puts it on the website",
        body: "Guests see this stay on the page of every destination within 50 km of its pin. At the place with a phone? Press Use my location.",
      },
    },
    facilities: {
      question: "What can guests use?",
      description: "Tick everything a guest can use today, then breakfast and parking.",
      tip: {
        title: "Only list what is there",
        body: "A guest who chooses a stay for something expects to find it. Leave out anything seasonal or on request.",
      },
    },
    photos: {
      question: "Show it at its best",
      description: "The cover is the first thing guests see: on cards, in search, and across the top of its page.",
      tip: {
        title: "Show what makes it different",
        body: "A stay without a usual type needs its photo to explain it — the tent, the boat, the treehouse. No logos, text or collages.",
      },
    },
    rooms: {
      question: "What can guests book?",
      description: "Add each kind of room, tent or bed once: how many people it sleeps and what one night costs.",
      tip: {
        title: "One entry per kind",
        body: "Five identical tents are one entry, with 5 in “How many rooms like this”. The cheapest bookable one sets the “From” price.",
      },
    },
    rules: {
      question: "What are the rules?",
      description: "When guests can arrive and must leave, and what they may bring and do.",
      tip: {
        title: "Rules that avoid surprises",
        body: "Arrival times and a pets and smoking rule answer the questions guests otherwise send by message.",
      },
    },
    policies: {
      question: "What does a night cost, and how can guests pay?",
      description: "The price guests see first, the ways they can pay, and the languages spoken.",
      tip: {
        title: "Show the lowest honest price",
        body: "“From” is one night in the cheapest option, taxes included. It follows the cheapest one by itself once they have prices.",
      },
    },
    review: published("stay"),
  },
};

/** The review list's lines that read differently for each kind of stay. */
export const STAY_CHECK_WORDS: Readonly<Record<string, { readonly rooms: string; readonly price: string; readonly own: string }>> = {
  HOTEL: { rooms: "At least one room", price: "Cheapest room, per night", own: "What kind of hotel, its desk and events" },
  GUESTHOUSE: { rooms: "At least one room", price: "Cheapest room, per night", own: "The house and what the hosts arrange" },
  HOSTEL: { rooms: "At least one dorm or room", price: "Cheapest bed, per night", own: "Its beds and its social life" },
  RESORT: { rooms: "At least one room or villa", price: "Cheapest room, per night", own: "Its setting, meal plans and activities" },
  HOMESTAY: { rooms: "At least one room in the home", price: "One night in the home", own: "The home and what guests join in" },
  VILLA: { rooms: "The villa, with its beds and price", price: "The villa, per night", own: "The villa, its staff and setting" },
  OTHER: { rooms: "At least one room", price: "Price from", own: "" },
};
