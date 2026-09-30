import type { ListingStep } from "@/features/catalog/components/listing-form/steps";

/**
 * What each kind of place to eat is told on each step of its form, in its own
 * words — the mirror of STAY_WORDS. Only the wording changes: the steps and
 * the fields on them are the same for every kind, so a cafe, a bar and a stall
 * each read a form written for them, and a place that changes its kind keeps
 * everything it has written.
 *
 * There is no BAKERY and no BAR: a bakery is a cafe that bakes and a bar a
 * restaurant that pours, and each picks its own words on that kind's list
 * (see FoodSpecialties).
 *
 * Step ids: about, location, menu, known, photos, review. Two of them — menu
 * and known — also take each kind's own title, because "Menu & prices" is the
 * wrong name for a drinks list and "Known for" for a bakery's oven.
 */

type StepWords = Partial<Pick<ListingStep, "title" | "question" | "description" | "tip">> & {
  /** Headings inside the step in this kind's words, by the first field of the group they head. */
  readonly groupTitles?: Readonly<Record<string, string>>;
};

/** The pin tip, which differs only in the noun and the example. */
const pinned = (noun: string, example: string, extra = ""): StepWords["tip"] => ({
  title: "The pin puts it on the website",
  body: `Travellers see this ${noun} on the page of every destination within 50 km of its pin — ${example} — so there is no destination to choose.${extra} At the place with a phone? Press Use my location.`,
});

const published = (noun: string): StepWords => ({
  description: `Check what is still missing, then choose whether travellers can see the ${noun} yet.`,
  tip: {
    title: "Nothing here is final",
    body: `A published ${noun} appears on the website straight away. A draft stays here until it is published, and either can be changed later.`,
  },
});

/** Every kind is asked the same thing of its cover; only what is in the photo changes. */
const cover = (noun: string, subjects: string): StepWords => ({
  question: `Show the ${noun} at its best`,
  description: `The cover leads every card and the top of its page: ${subjects}.`,
  tip: {
    title: "What makes a great cover",
    body: "One bright photo of the place itself, with no text, logos or collages. 1600 × 900 pixels or larger stays sharp everywhere.",
  },
});

export const FOOD_WORDS: Readonly<Record<string, Readonly<Record<string, StepWords>>>> = {
  /* A bar is a restaurant that pours, so it reads these words too. */
  RESTAURANT: {
    about: {
      question: "What's the restaurant called, and what's it like?",
      description: "What kind of place it is, what it is called, and one line that makes a traveller want a table.",
      tip: {
        title: "Lead with what people book a table for",
        body: "“Charcoal-grilled river fish on a terrace over the water, open late” tells a traveller more than “good food and friendly service”. A bar belongs here too — lead with the drinks and the view.",
      },
    },
    location: {
      question: "Where is the restaurant, when is it open, and how do people book?",
      description: "Pin it on the map, set the hours for each day, and add the ways to get in touch.",
      tip: pinned("restaurant", "a restaurant in Siem Reap on Angkor Wat's page, say"),
    },
    menu: {
      title: "Menu & prices",
      question: "What is on the menu, and what does it cost?",
      description: "Each dish and each drink once — what it is called, what is in it and what it costs — then what a meal comes to, and how people pay.",
      groupTitles: { priceRange: "What a meal costs" },
      tip: {
        title: "Five dishes beat fifty",
        body: "Write what people come for, with prices and their Khmer names — the Khmer name is what a traveller points at to order. Drinks go on the same menu under their own heading. The cheapest thing on it sets the “From” price travellers see.",
      },
    },
    known: {
      title: "How it serves & pours",
      question: "How does the restaurant serve, cook, host and pour?",
      description: "How the dishes reach the table, how the kitchen works, what it can do for a group, whether there is a dress code — and, if the drinks come first, what is behind the bar and what is on which night.",
      tip: {
        title: "Only what is true today",
        body: "Travellers choose a table on these. Tick only what they will really find — a tasting menu that runs twice a year is not one. A bar ticks nothing under Cooking and everything under Drinks and Nights; both read as one place.",
      },
    },
    photos: cover("restaurant", "the dining room, the terrace, the bar, or the dish it is known for"),
    review: published("restaurant"),
  },

  /* A bakery is a cafe that bakes, so it reads these words too. */
  CAFE: {
    about: {
      question: "What's the cafe called, and what's it like?",
      description: "What kind of place it is, what it is called, and one line that makes a traveller stop for a coffee or a bake.",
      tip: {
        title: "Lead with what people stop for",
        body: "“Mondulkiri beans roasted in-house, and baguettes warm by seven” tells a traveller more than “nice coffee and free Wi-Fi”. A bakery belongs here too — lead with what comes out of the oven.",
      },
    },
    location: {
      question: "Where is the cafe, when is it open, and how do people reach it?",
      description: "Pin it on the map, set the hours for each day, and add the ways to get in touch.",
      tip: pinned("cafe", "a cafe in Siem Reap on Angkor Wat's page, say"),
    },
    menu: {
      title: "Menu & prices",
      question: "What is on the board, and what does it cost?",
      description: "Each item once — the coffees, the other drinks and everything on the counter — then what a coffee and a cake come to, and how people pay.",
      groupTitles: { priceRange: "What a coffee and a cake cost" },
      tip: {
        title: "The board people read at the counter",
        body: "Write what people actually order, with prices and their Khmer names. The cheapest item on the board sets the “From” price travellers see.",
      },
    },
    known: {
      title: "Coffee & counter",
      question: "What does the cafe pour, and what does it bake?",
      description: "The coffees you make, the other drinks, where the beans come from, which milks you keep — and, if you bake, what comes out of the oven and how fresh it is.",
      tip: {
        title: "This is what a traveller reads first",
        body: "Where the beans are from, and whether you roast them yourself, decides the stop for many. So does oat or soy milk. A bakery ticks nothing under Coffee and everything under Baked here — both read as one place.",
      },
    },
    photos: cover("cafe", "the room, the terrace, the coffee or the counter full"),
    review: published("cafe"),
  },

  STREET_FOOD: {
    about: {
      question: "What's the stall called, and what does it cook?",
      description: "What kind of place it is, what people call it, and one line that makes a traveller stop.",
      tip: {
        title: "Lead with the plate people stop for",
        body: "“Charcoal-grilled pork and rice from six in the morning” tells a traveller more than “tasty local food”. No name over the stall? Use what people call it: “the pork rice cart on Street 240”.",
      },
    },
    location: {
      question: "Where is the stall, when does it sell, and how do people find it?",
      description: "Pin it on the map, set the hours it is really there, and add the ways to get in touch.",
      tip: pinned("stall", "a noodle stall in Siem Reap on Angkor Wat's page, say", " A cart that moves? Pin where it stands most nights."),
    },
    menu: {
      title: "Plates & prices",
      question: "What do you cook, and what does it cost?",
      description: "Each plate once — what it is called and what it costs — then what a plate comes to, and how people pay.",
      groupTitles: { priceRange: "What a plate costs" },
      tip: {
        title: "Three plates are enough",
        body: "Most stalls cook a few things and cook them well. Write those, with prices and their Khmer names — the Khmer name is what a traveller points at to order.",
      },
    },
    known: {
      title: "How you cook",
      question: "How do you cook, what do you sell from, and when?",
      description: "The fire or the pot you cook over, the cart or the pitch you sell from, and the part of the day you are there.",
      tip: {
        title: "The charcoal is the photo they came for",
        body: "How it is cooked in front of them is most of why a traveller chooses one stall over the next. Selling times here are the short answer; the exact hours go in Opening hours.",
      },
    },
    photos: cover("stall", "the grill going, or the plate as it is handed over"),
    review: published("stall"),
  },

  MARKET: {
    about: {
      question: "What's the market called, and what's it like?",
      description: "What kind of place it is, what it is called, and one line that makes a traveller walk through it.",
      tip: {
        title: "Lead with what a traveller will find",
        body: "“Fifty evening stalls of grilled seafood beside the river” tells a traveller more than “a busy local market”.",
      },
    },
    location: {
      question: "Where is the market, when is it open, and how do people reach it?",
      description: "Pin it on the map, set the hours it is trading, and add the ways to get in touch.",
      tip: pinned("market", "a night market in Siem Reap on Angkor Wat's page, say", " Pin the entrance travellers should use."),
    },
    menu: {
      title: "Food stalls & prices",
      question: "What can a traveller eat here, and what does it cost?",
      description: "The dishes worth coming for, one at a time, then what a plate comes to and how the stalls are paid.",
      groupTitles: { priceRange: "What a plate costs" },
      tip: {
        title: "Write the market's own dishes",
        body: "Not every stall — the plates a traveller comes here for, with prices and their Khmer names. Most stalls take cash only; say so under Paying.",
      },
    },
    known: {
      title: "Kind of market",
      question: "What kind of market is it?",
      description: "Whether it trades by day, by night or as a wet market, what else is sold besides food, and roughly how many food stalls there are.",
      tip: {
        title: "Size and time decide the visit",
        body: "A traveller with one free evening picks a night market with fifty stalls over a morning wet market. Both are worth listing — just say which this is.",
      },
    },
    photos: cover("market", "the aisles busy, or the stall it is known for"),
    review: published("market"),
  },

  /* No list of its own, so no "known for" step: only its money words change. */
  OTHER: {
    about: {
      question: "What's the place called, and what's it like?",
      description: "What kind of place it is, what it is called, and one line that makes a traveller go.",
      tip: {
        title: "Lead with what people come for",
        body: "Say what a traveller would actually get there. If one of the kinds above fits better, pick it — the form is written for each of them, and this one is the catch-all.",
      },
    },
    menu: { groupTitles: { priceRange: "What a visit costs" } },
    review: published("place"),
  },
};

/**
 * The "ready to publish" lines that read differently per kind: what the menu
 * holds, what the price answers, and each kind's own list. An empty string
 * drops the line, as "Other" has no list of its own.
 */
export const FOOD_CHECK_WORDS: Readonly<Record<string, { readonly menu: string; readonly price: string; readonly own: string }>> = {
  RESTAURANT: { menu: "At least one dish or drink", price: "What a meal costs", own: "How you serve, cook, host and pour" },
  CAFE: { menu: "At least one item on the board", price: "What a coffee and a cake cost", own: "Your coffee, beans, milk and bakes" },
  STREET_FOOD: { menu: "At least one plate", price: "What a plate costs", own: "How and where you cook" },
  MARKET: { menu: "At least one dish worth coming for", price: "What a plate costs", own: "What kind of market it is" },
  OTHER: { menu: "At least one item", price: "What a visit costs", own: "" },
};
