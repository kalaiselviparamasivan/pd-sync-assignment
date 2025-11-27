import dotenv from "dotenv";
import type { PipedrivePerson } from "./types/pipedrive";
import inputData from "./mappings/inputData.json";
import mappings from "./mappings/mappings.json";

dotenv.config();

const apiKey = process.env.PIPEDRIVE_API_KEY;
const companyDomain = process.env.PIPEDRIVE_COMPANY_DOMAIN;

// Write your code here
const syncPdPerson = async (): Promise<PipedrivePerson> => {
  try {
    if (!apiKey || !companyDomain) {
      throw new Error("Missing Pipedrive API credentials in .env file");
    }
    const apiUrl = `https://${companyDomain}.pipedrive.com/api/v1`;
    const payload: Record<string, any> = {};
    for (const map of mappings) {
      const { pipedriveKey, inputKey } = map;

      const value = inputKey.split(".").reduce((acc: any, key: string) => acc?.[key], inputData);
      if (value === undefined) {
        console.warn(`Missing value for inputKey: ${inputKey}`);
        continue;
      }
      payload[pipedriveKey] = value;
    }
    const nameValue = payload["name"];
    if (!nameValue) {
      throw new Error("Mapped 'name' value is missing. Cannot search person.");
    }
    const searchRes = await fetch(`${apiUrl}/persons/find?term=${encodeURIComponent(nameValue)}&api_token=${apiKey}`);
    const searchJson = await searchRes.json();
    const existing = searchJson?.data?.[0];
    let finalPerson;
    if (existing) {
      const updateRes = await fetch(`${apiUrl}/persons/${existing.id}?api_token=${apiKey}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const updateJson = await updateRes.json();
      finalPerson = updateJson.data;
      console.log("Updated existing person:", finalPerson?.id);
    } else {
      const createRes = await fetch(`${apiUrl}/persons?api_token=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const createJson = await createRes.json();
      finalPerson = createJson.data;
      console.log("Created new person:", finalPerson?.id);
    }
    return finalPerson;
  } catch (error: any) {
    console.error("Error syncing Pipedrive person:", error.message);
    throw error;
  }
};

const pipedrivePerson = syncPdPerson();
console.log(pipedrivePerson);
