"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const inputData_json_1 = __importDefault(require("./mappings/inputData.json"));
const mappings_json_1 = __importDefault(require("./mappings/mappings.json"));
// Load environment variables from .env file
dotenv_1.default.config();
// Get API key and company domain from environment variables
const apiKey = process.env.PIPEDRIVE_API_KEY;
const companyDomain = process.env.PIPEDRIVE_COMPANY_DOMAIN;
// Write your code here
const syncPdPerson = async () => {
    try {
        if (!apiKey || !companyDomain) {
            throw new Error("Missing Pipedrive API credentials in .env file");
        }
        // Create API client
        const apiUrl = `https://${companyDomain}.pipedrive.com/api/v1`;
        // 1️⃣ Build person payload using mappings.json
        const payload = {};
        for (const map of mappings_json_1.default) {
            const { pipedriveKey, inputKey } = map;
            // Support nested values (e.g., phone.home)
            const value = inputKey
                .split(".")
                .reduce((acc, key) => acc?.[key], inputData_json_1.default);
            if (value === undefined) {
                console.warn(`⚠ Missing value for inputKey: ${inputKey}`);
                continue;
            }
            payload[pipedriveKey] = value;
        }
        // 2️⃣ Must find name field to check person existing
        const nameValue = payload["name"];
        if (!nameValue) {
            throw new Error("Mapped 'name' value is missing. Cannot search person.");
        }
        // 3️⃣ Search existing person by name
        const searchRes = await fetch(`${apiUrl}/persons/find?term=${encodeURIComponent(nameValue)}&api_token=${apiKey}`);
        const searchJson = await searchRes.json();
        const existing = searchJson?.data?.[0];
        let finalPerson;
        if (existing) {
            // 4️⃣ Update existing person
            const updateRes = await fetch(`${apiUrl}/persons/${existing.id}?api_token=${apiKey}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const updateJson = await updateRes.json();
            finalPerson = updateJson.data;
            console.log("✔ Updated existing person:", finalPerson?.id);
        }
        else {
            // 5️⃣ Create new person
            const createRes = await fetch(`${apiUrl}/persons?api_token=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const createJson = await createRes.json();
            finalPerson = createJson.data;
            console.log("Created new person:", finalPerson?.id);
        }
        return finalPerson;
    }
    catch (error) {
        console.error("Error syncing Pipedrive person:", error.message);
        throw error;
    }
};
const pipedrivePerson = syncPdPerson();
console.log(pipedrivePerson);
//# sourceMappingURL=index.js.map