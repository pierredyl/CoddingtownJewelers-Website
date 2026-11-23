export interface StoreFaqItem {
  id: string;
  question: string;
  answer: string;
}

/**
 * Editable Frequently Asked Questions displayed in the Contact section on the Home Page.
 * To add a Q&A: copy any object below and give it a unique `id`.
 * To remove a Q&A: delete its object from the array.
 */
export const STORE_FAQS: StoreFaqItem[] = [
  {
    id: "pricing-availability",
    question: "How do I check pricing or availability for a piece I see online?",
    answer:
      "Select your preferred metal, stone, or size on any piece in the catalogue to see its Item Number, then call, email, or stop by with that Item # and we will confirm current pricing and availability right away.",
  },
  {
    id: "repairs-sizing",
    question: "Do you offer jewelry repairs and ring sizing in store?",
    answer:
      "Yes — ring resizing, stone setting, prong work, chain repairs, and restorations are handled right here at our store in Coddingtown Center. Bring your piece in anytime for a look.",
  },
  {
    id: "complimentary-cleaning",
    question: "Can I stop by for a complimentary jewelry cleaning?",
    answer:
      "Anytime we are open. Walk-ins are always welcome for complimentary jewelry cleaning, no appointment needed.",
  },
  {
    id: "custom-orders",
    question: "Can I personalize a piece with a different metal, length, or stone?",
    answer:
      "Yes. Many pieces in our catalogue can be ordered in yellow, white, or rose gold, platinum, or sterling silver, as well as different stone shapes and sizes. We can also help you special-order or customize a piece at the counter.",
  },
  {
    id: "appointments",
    question: "Do I need an appointment to visit?",
    answer:
      "No appointment is necessary — walk right in during regular store hours. If you would like to set aside dedicated time for an engagement ring or custom project, feel free to call ahead.",
  },
];
