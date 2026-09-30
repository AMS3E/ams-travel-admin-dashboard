import type { ListingStep } from "@/features/catalog/components/listing-form/steps";

/**
 * What an attraction is told on each step of its form, in its theme's own
 * words — the mirror of FOOD_WORDS and STAY_WORDS. A theme is the tourism
 * region the place is mainly about (by the region's code). Only the wording
 * changes, so a place that changes its theme keeps everything it has.
 *
 * Step ids: theme, about, location, classification (Where it appears),
 * visiting (what only its theme has), photos, review. The visiting step also
 * takes each theme's own title; Ancient Capitals has none (`omit`).
 */

type StepWords = Partial<Pick<ListingStep, "title" | "question" | "description" | "tip">> & {
  /** This theme has no such step: an ancient site's history is told by its tags. */
  readonly omit?: boolean;
};

const published = (noun: string): StepWords => ({
  description: `Check what is still missing, then choose whether travellers can see the ${noun} yet.`,
  tip: {
    title: "Nothing here is final",
    body: `A published ${noun} appears on the website straight away. A draft stays here until it is published, and either can be changed later.`,
  },
});

const whereItAppears = (noun: string, region: string, example: string): StepWords => ({
  description: `Only ${region}'s own categories, search filters and interests are offered. The ${noun} is listed on its Discover page.`,
  tip: {
    title: "Two or three accurate categories",
    body: `A traveller browsing ${region} filters by these — ${example}. Tick only what is true of this ${noun}.`,
  },
});

export const DESTINATION_WORDS: Readonly<Record<string, Readonly<Record<string, StepWords>>>> = {
  "ANCIENT-CAPITALS": {
    theme: {
      description: "A temple, an ancient city, a bridge or a museum of the Khmer empire: the form asks about its history and how to visit it.",
      tip: { title: "Ancient Capitals & Khmer Civilization", body: "For the places of Angkor, Koh Ker, Sambor Prei Kuk and the Khmer kings. A modern pagoda in town fits Urban Lifestyle better." },
    },
    about: {
      question: "What's the site called, and what's its story?",
      description: "Its name, one line that makes someone want to see it, and its history.",
      tip: { title: "Lead with who built it", body: "“Built by Jayavarman VII in the late 12th century, its towers carry 216 smiling faces” tells a traveller more than “A beautiful old temple”." },
    },
    location: {
      question: "Where is the site?",
      description: "Its province, and a pin on its main entrance — where the tuk-tuk stops.",
      tip: { title: "Pin the entrance", body: "A temple complex is large. Put the pin on the gate travellers arrive at, not in the middle of the ruins." },
    },
    classification: whereItAppears("site", "Ancient Capitals & Khmer Civilization", "“Temples”, “Ancient Cities”, “Museums”"),
    /* No History & visiting step: its Century, King, Architecture Style, Religion and Historical Period tags tell its history. */
    visiting: { omit: true },
    photos: {
      question: "Show the site at its best",
      description: "The cover leads every card and the top of its page: its towers, its gate, or its best-known carving.",
      tip: { title: "What makes a great cover", body: "The temple in soft morning or evening light, straight on. No people crowding the frame, no text or logos." },
    },
    review: published("site"),
  },
  NORTHEASTERN: {
    theme: {
      description: "Forest, a crater lake, a waterfall or an indigenous village of Ratanakiri and Mondulkiri: the form asks about its nature, people and access.",
      tip: { title: "Northeastern Civilization", body: "For the highlands of the northeast — forests, volcano lakes and the Bunong, Tampuan and Jarai villages." },
    },
    about: {
      question: "What's the place called, and what's it like?",
      description: "Its name, one line that makes someone want to go, and what it is like to be there.",
      tip: { title: "Lead with the landscape", body: "“A perfectly round crater lake, warm enough to swim in, ringed by forest” beats “A nice lake in the jungle”." },
    },
    location: {
      question: "Where is the place, and how do you get in?",
      description: "Its province, and a pin where travellers arrive — the trailhead, the village gate or the lake shore.",
      tip: { title: "Pin where the road ends", body: "Roads here end at the forest. Pin the last point a car or motorbike reaches, and say the rest in the description." },
    },
    classification: whereItAppears("place", "Northeastern Civilization", "“Indigenous Culture”, “Volcano Lake”, “Wildlife”"),
    visiting: {
      title: "Nature & people",
      question: "What is its nature, and who lives there?",
      description: "The nature it is known for, the people and the guides, and how hard it is to reach.",
      tip: { title: "Say when it can be reached", body: "Many roads are mud in the rains. “Best in the dry season” and “A guide is required” save a traveller a wasted day." },
    },
    photos: {
      question: "Show the place at its best",
      description: "The cover leads every card and the top of its page: the lake, the forest or the waterfall.",
      tip: { title: "What makes a great cover", body: "Wide and green, in daylight. Photograph people from the villages only with their permission." },
    },
    review: published("place"),
  },
  "MEKONG-TONLE-SAP": {
    theme: {
      description: "A floating village, a river island, a bird sanctuary or the dolphins of the Mekong: the form asks about life on the water and its seasons.",
      tip: { title: "Mekong & Tonle Sap Civilization", body: "For the great river and the lake — the places reached by boat, and the villages that live with the water." },
    },
    about: {
      question: "What's the place called, and what's life there like?",
      description: "Its name, one line that makes someone want to go, and what life on the water is like there.",
      tip: { title: "Lead with the water", body: "“Houses on stilts ten metres tall, and a boat ride through the flooded forest” tells a traveller more than “A traditional village”." },
    },
    location: {
      question: "Where is it, and where do the boats leave from?",
      description: "Its province, and a pin where travellers start — usually the pier.",
      tip: { title: "Pin the pier", body: "A floating village moves with the water. Pin the pier the boats leave from, which stays put all year." },
    },
    classification: whereItAppears("place", "Mekong & Tonle Sap Civilization", "“Floating Village”, “Boat Trip”, “Bird Sanctuary”"),
    visiting: {
      title: "Life on the water",
      question: "What happens on the water, and when is it best?",
      description: "What travellers do on the water, the season it is best in, and the village itself.",
      tip: { title: "The water changes everything", body: "The lake grows five times over in the rains. Say whether it is best at high or low water, so travellers come at the right time." },
    },
    photos: {
      question: "Show the place at its best",
      description: "The cover leads every card and the top of its page: the stilt houses, the boats or the sunset over the water.",
      tip: { title: "What makes a great cover", body: "From the water, in the golden hour. No text or logos." },
    },
    review: published("place"),
  },
  "MOUNTAIN-WATERFALL": {
    theme: {
      description: "A mountain, a national park, a waterfall or a viewpoint: the form asks about the trail, the water and the views.",
      tip: { title: "Mountain & Waterfall Region", body: "For Bokor, Kirirom, the Cardamoms and every waterfall worth the walk." },
    },
    about: {
      question: "What's the place called, and what's it like?",
      description: "Its name, one line that makes someone want to go, and what the walk and the view are like.",
      tip: { title: "Lead with the reward", body: "“A 40-minute forest walk to a three-tiered fall you can swim under” beats “A beautiful waterfall in the mountains”." },
    },
    location: {
      question: "Where is it, and where does the trail start?",
      description: "Its province, and a pin on the trailhead or the car park.",
      tip: { title: "Pin the trailhead", body: "Travellers navigate to the pin. Put it where they leave the car, not at the falls deep in the forest." },
    },
    classification: whereItAppears("place", "Mountain & Waterfall Region", "“Waterfall”, “Trekking”, “Viewpoint”"),
    visiting: {
      title: "Trails & views",
      question: "How hard is the trail, and what is at the end?",
      description: "How hard the walk is, whether you can swim, and the views and nights it is known for.",
      tip: { title: "Be honest about the trail", body: "“Hard trek” keeps families away from a climb they would regret. A waterfall that dries up in March should say “Fullest in the wet season”." },
    },
    photos: {
      question: "Show the place at its best",
      description: "The cover leads every card and the top of its page: the falls, the peak or the view.",
      tip: { title: "What makes a great cover", body: "The falls full of water, or the view at sunrise. Landscape, bright, no text." },
    },
    review: published("place"),
  },
  "COASTAL-ISLAND": {
    theme: {
      description: "A beach, an island, a reef or a mangrove: the form asks about the sand, the sea and getting there.",
      tip: { title: "Coastal & Island Region", body: "For Kep, Kampot's coast, Sihanoukville, Koh Rong and every island worth the crossing." },
    },
    about: {
      question: "What's the beach or island called, and what's it like?",
      description: "Its name, one line that makes someone want to go, and what a day there is like.",
      tip: { title: "Lead with the water", body: "“Half a mile of white sand, water calm enough for children, and a reef off the point” tells a traveller what to pack." },
    },
    location: {
      question: "Where is it, and where do the boats leave from?",
      description: "Its province, and a pin on the beach itself.",
      tip: { title: "Pin the beach, name the pier", body: "Pin the beach travellers will stand on. If it is reached by boat, say which pier in the description." },
    },
    classification: whereItAppears("beach or island", "Coastal & Island Region", "“Beach”, “Island”, “Snorkeling”"),
    visiting: {
      title: "Beach & sea",
      question: "What are the beach and the sea like, and how do you get there?",
      description: "The sand and the swimming, what there is to do in the water, the crossing, and what is on the beach.",
      tip: { title: "Say whether it is safe to swim", body: "Families choose on “Calm water” and “Safe for swimming”. A beach with a strong current should not tick them." },
    },
    photos: {
      question: "Show the beach at its best",
      description: "The cover leads every card and the top of its page: the sand and the sea.",
      tip: { title: "What makes a great cover", body: "The beach in bright sun, the water's colour showing. No people crowding it, no text." },
    },
    review: published("beach or island"),
  },
  "URBAN-LIFESTYLE": {
    theme: {
      description: "A landmark, a gallery, a market, a rooftop or a street of cafes: the form asks what it is and when to go.",
      tip: { title: "Urban Lifestyle & Nightlife", body: "For the cities — Phnom Penh, Siem Reap, Battambang — their landmarks, markets, galleries and nights out." },
    },
    about: {
      question: "What's the place called, and what's it like?",
      description: "Its name, one line that makes someone want to go, and what it is like at its best hour.",
      tip: { title: "Lead with the moment", body: "“The riverfront at dusk, when the whole city comes out to walk” beats “A popular area of the city”." },
    },
    location: {
      question: "Where in the city is it?",
      description: "Its province, and a pin on its entrance or its corner.",
      tip: { title: "Pin the corner", body: "In a city, a street and a number help most. Pin the entrance and write the street in the address." },
    },
    classification: whereItAppears("place", "Urban Lifestyle & Nightlife", "“City Walk”, “Night Market”, “Art Gallery”"),
    visiting: {
      title: "The city",
      question: "What is it, and when should you go?",
      description: "What kind of place it is, the hours it is at its best, and how to get around it.",
      tip: { title: "Say when it comes alive", body: "A night market at noon is an empty car park. “Best at night” and “Open late” send travellers at the right time." },
    },
    photos: {
      question: "Show the place at its best",
      description: "The cover leads every card and the top of its page: the landmark, the lights or the crowd.",
      tip: { title: "What makes a great cover", body: "Taken at the hour it is known for — the market lit up, the rooftop at sunset. No text or logos." },
    },
    review: published("place"),
  },
  "KHMER-CULINARY": {
    theme: {
      description: "A farm, a cooking school, a food street or a producer: the form asks what travellers taste and learn.",
      tip: { title: "Khmer Culinary Region", body: "For the places food comes from — pepper farms, palm-sugar makers, cooking classes. A restaurant is listed under Food instead." },
    },
    about: {
      question: "What's the place called, and what do you taste there?",
      description: "Its name, one line that makes someone hungry, and what a visit is like.",
      tip: { title: "Lead with the taste", body: "“Walk the pepper vines, then taste red, black and white Kampot pepper side by side” tells a traveller exactly why to come." },
    },
    location: {
      question: "Where is it?",
      description: "Its province, and a pin on its gate or its kitchen.",
      tip: { title: "Pin the farm gate", body: "Farms sit down dirt roads. Pin the gate travellers arrive at, and say in the description how the road is." },
    },
    classification: whereItAppears("place", "Khmer Culinary Region", "“Traditional Food”, “Cooking Class”, “Farm”"),
    visiting: {
      title: "Taste & learn",
      question: "What do travellers taste and learn?",
      description: "What they taste, what they learn to make, and whether to book.",
      tip: { title: "Say whether to book", body: "A cooking class with six places fills up. “Book ahead” saves a traveller a wasted ride." },
    },
    photos: {
      question: "Show the place at its best",
      description: "The cover leads every card and the top of its page: the food, the farm or the kitchen.",
      tip: { title: "What makes a great cover", body: "The dish or the harvest up close, in daylight. No text or logos." },
    },
    review: published("place"),
  },
  "ECO-COMMUNITY": {
    theme: {
      description: "A village, a community homestay, a craft workshop or a conservation project: the form asks about the community and how visits help.",
      tip: { title: "Eco-Community Tourism", body: "For places run by and for the people who live there — Chi Phat, Prek Toal, the silk and pottery villages." },
    },
    about: {
      question: "What's the community called, and what's it like?",
      description: "Its name, one line that makes someone want to stay, and what life there is like.",
      tip: { title: "Lead with the people", body: "“Twenty families who swapped hunting for guiding, and take guests on forest treks and river trips” says why the visit matters." },
    },
    location: {
      question: "Where is the community, and how do you reach it?",
      description: "Its province, and a pin on the community centre or the landing.",
      tip: { title: "Pin where visitors check in", body: "Most communities have a centre where guests register. Pin it, and say in the description how the last stretch is travelled." },
    },
    classification: whereItAppears("community", "Eco-Community Tourism", "“Homestay”, “Village”, “Craft”"),
    visiting: {
      title: "Community",
      question: "Who runs it, and how do visits help?",
      description: "What the community offers, where the money goes, and how to get there.",
      tip: { title: "Say where the money goes", body: "Travellers choose community tourism to help. “Fees go to the village” is worth ticking only when it is true." },
    },
    photos: {
      question: "Show the community at its best",
      description: "The cover leads every card and the top of its page: the village, the craft or the landscape around it.",
      tip: { title: "What makes a great cover", body: "Daily life with the community's permission, in daylight. No text or logos." },
    },
    review: published("community"),
  },
  "LUXURY-TOURISM": {
    theme: {
      description: "A private island, a helicopter tour, a yacht, a golf course or a spa: the form asks about the private experience.",
      tip: { title: "Luxury Tourism", body: "For experiences sold on privacy and service. A hotel is listed under Stays instead." },
    },
    about: {
      question: "What's the experience called, and what's it like?",
      description: "Its name, one line that makes someone want it, and what makes it exceptional.",
      tip: { title: "Lead with what no one else has", body: "“Angkor from the air at sunrise, then breakfast on a private terrace” tells a traveller why it costs what it does." },
    },
    location: {
      question: "Where does it take place?",
      description: "Its province, and a pin where guests are met.",
      tip: { title: "Pin the meeting point", body: "A helicopter pad or a marina is where guests start. Pin it, and say in the description whether a transfer is included." },
    },
    classification: whereItAppears("experience", "Luxury Tourism", "“Private Island”, “Helicopter”, “Spa”"),
    visiting: {
      title: "Private experience",
      question: "What is private about it, and how is it booked?",
      description: "What is private, the comfort that comes with it, and how it is booked.",
      tip: { title: "Say how it is booked", body: "“By appointment only” and “Exclusive use” tell a traveller to plan ahead, and that it is theirs alone." },
    },
    photos: {
      question: "Show the experience at its best",
      description: "The cover leads every card and the top of its page: the view, the island or the moment it is sold on.",
      tip: { title: "What makes a great cover", body: "The view guests pay for, in the best light. No text or logos." },
    },
    review: published("experience"),
  },
};

/** The review list's lines that read differently for each theme. */
export const DESTINATION_CHECK_WORDS: Readonly<Record<string, { readonly own: string }>> = {
  "ANCIENT-CAPITALS": { own: "" },
  NORTHEASTERN: { own: "Its nature, people and access" },
  "MEKONG-TONLE-SAP": { own: "Life on the water, and its seasons" },
  "MOUNTAIN-WATERFALL": { own: "The trail, the water and the views" },
  "COASTAL-ISLAND": { own: "The beach, the sea and the crossing" },
  "URBAN-LIFESTYLE": { own: "What it is, and when to go" },
  "KHMER-CULINARY": { own: "What you taste and learn" },
  "ECO-COMMUNITY": { own: "The community, and how visits help" },
  "LUXURY-TOURISM": { own: "The private experience" },
};
