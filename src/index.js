import { createApp } from "@deroll/app";
import { getAddress, hexToString, stringToHex } from "viem";

const app = createApp({ url: process.env.ROLLUP_HTTP_SERVER_URL || "http://127.0.0.1:5004" });

let subscriptions = {};

app.addAdvanceHandler(async ({ metadata, payload }) => {
    const sender = getAddress(metadata.msg_sender);
    const payloadString = hexToString(payload);
    console.log("Sender:", sender, "Payload:", payloadString);

    try {
        const jsonPayload = JSON.parse(payloadString);

        if (jsonPayload.method === "subscribe") {
            subscriptions[sender] = {
                service: jsonPayload.service,
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days subscription
            };
            console.log("Subscribed to:", jsonPayload.service);

        } else if (jsonPayload.method === "renew_subscription") {
            const sub = subscriptions[sender];
            if (sub) {
                sub.expiryDate = new Date(sub.expiryDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                console.log("Subscription renewed for:", jsonPayload.service);
            }

        } else if (jsonPayload.method === "cancel_subscription") {
            delete subscriptions[sender];
            console.log("Subscription cancelled for:", jsonPayload.service);
        }

        return "accept";
    } catch (e) {
        console.error(e);
        app.createReport({ payload: stringToHex(String(e)) });
        return "reject";
    }
});

app.addInspectHandler(async ({ payload }) => {
    const address = getAddress(hexToString(payload).split("/")[1]);
    const subscription = subscriptions[address] || {};
    await app.createReport({ payload: stringToHex(JSON.stringify(subscription)) });
});

app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
