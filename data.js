// Static reference data + seed content for the demo.
const CATEGORIES = [
  "Electrician", "Plumber", "Carpenter", "Painter", "Domestic Help",
  "Caregiver", "Driver", "Gardener", "Cleaner", "Technician"
];

const CITIES = [
  "Jamui", "Patna", "Lucknow", "Ranchi", "Delhi", "Mumbai", "Pune", "Bengaluru"
];

// kyc: "verified" | "pending"  |  certificate: trade/skill certificate id
const SEED_WORKERS = [
  { name: "Ramesh Yadav", phone: "9800000001", city: "Jamui", coop: "Jamui Labour Cooperative", skills: ["Electrician", "Technician"], rating: 4.8, ratingsCount: 21, completedJobs: 34, available: true, kyc: "verified", certificate: "ITI-EL-2291" },
  { name: "Sunita Devi", phone: "9800000002", city: "Jamui", coop: "Jamui Labour Cooperative", skills: ["Domestic Help", "Cleaner"], rating: 4.9, ratingsCount: 40, completedJobs: 58, available: true, kyc: "verified", certificate: "" },
  { name: "Md. Irfan", phone: "9800000003", city: "Patna", coop: "Patna Nirman Sahkari Samiti", skills: ["Plumber", "Technician"], rating: 4.6, ratingsCount: 15, completedJobs: 22, available: true, kyc: "verified", certificate: "ITI-PL-7710" },
  { name: "Kavita Kumari", phone: "9800000004", city: "Patna", coop: "Patna Seva Cooperative", skills: ["Caregiver", "Domestic Help"], rating: 4.7, ratingsCount: 18, completedJobs: 27, available: true, kyc: "verified", certificate: "" },
  { name: "Arvind Singh", phone: "9800000005", city: "Lucknow", coop: "Awadh Labour Cooperative", skills: ["Carpenter", "Painter"], rating: 4.5, ratingsCount: 12, completedJobs: 19, available: true, kyc: "pending", certificate: "" },
  { name: "Deepak Oraon", phone: "9800000006", city: "Ranchi", coop: "Ranchi Shramik Sangh", skills: ["Driver"], rating: 4.4, ratingsCount: 9, completedJobs: 14, available: true, kyc: "verified", certificate: "DL-JH-4482" },
  { name: "Fatima Sheikh", phone: "9800000007", city: "Delhi", coop: "Delhi Griha Seva Cooperative", skills: ["Cleaner", "Domestic Help"], rating: 4.9, ratingsCount: 33, completedJobs: 45, available: true, kyc: "verified", certificate: "" },
  { name: "Ganesh Pawar", phone: "9800000008", city: "Mumbai", coop: "Mumbai Kamgar Cooperative", skills: ["Painter", "Carpenter"], rating: 4.3, ratingsCount: 8, completedJobs: 11, available: true, kyc: "pending", certificate: "" },
  { name: "Lakshmi Naik", phone: "9800000009", city: "Bengaluru", coop: "Bengaluru Seva Sahakari", skills: ["Gardener", "Cleaner"], rating: 4.6, ratingsCount: 14, completedJobs: 20, available: true, kyc: "verified", certificate: "" },
  { name: "Vikram Jadhav", phone: "9800000010", city: "Pune", coop: "Pune Shramik Cooperative", skills: ["Electrician", "Plumber"], rating: 4.2, ratingsCount: 6, completedJobs: 9, available: true, kyc: "verified", certificate: "ITI-EL-1123" }
];
