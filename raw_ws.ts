"use strict";

const token = "_96_token_421_";
const detailedHook = "_96_detaledStatus_421_";
const officialHook = "_96_officialStatus_421_";

const serverCountChannel = "1065338751833874482";
const baseAPI_URL = "https://discord.com/api/v10";
const baseCDN_URL = "https://cdn.discordapp.com";

import { WebSocket } from 'ws';

//edit channel function
let recursionEC: number = 0;
async function editChannel(cid: string, newName: string) {
    console.log(`[editing channel name to ${newName}]`);
    const proto_chnlUpdateRes = (await (await fetch(`${baseAPI_URL}/channels/${cid}`, {
        method: 'PATCH',
        body: JSON.stringify({
            name: newName
        }),
        headers: {
            "Authorization": `Bot ${token}`,
            "Content-Type": "application/json;charset=UTF-8"
        }
    })).json()) as channelPartial & {retry_after?: number} | null;

    if (!!proto_chnlUpdateRes?.retry_after && (recursionEC <= 3)){
        console.log(`[CHANNEL UPDATE IS BEING RATE LIMITED. Retrying after ${proto_chnlUpdateRes.retry_after}s.]`);
        recursionEC++;
        setTimeout(async () => {
            if (!sessionCreds.guilds) {
                console.log("[sessionCreds GUILDS UNDEFINED]");
                return;
            };
            console.log("[EXECUTING PENDING EDIT CHANNEL.]");
            if (!(await editChannel(serverCountChannel, `SERVER COUNT: ${sessionCreds.guilds.length}`))) console.log("[COULD NOT UPDATE CHANNEL NAME.]");
        }, proto_chnlUpdateRes.retry_after * 1000 + 1);
        return false;
    }
    if (!!proto_chnlUpdateRes?.id) recursionEC = 0;
    console.log(proto_chnlUpdateRes);
    return (!!proto_chnlUpdateRes?.id);
}

async function sendHook(hookURL: string, good: boolean, guild: guildPartial, detailed: boolean ) {
    if (!guild.name || !guild.member_count) {
        console.log("[UNDEFINED NAME OR MEMBER_COUNT]");
        return;
    };
    await fetch(hookURL, {
        body: JSON.stringify({
            content: null,
            username: "Anonymity Log",
            avatar_url: "https://cdn.discordapp.com/attachments/846317254009421834/850592523729633311/favpng_system2.png",
            allowed_mentions: {users: [], roles: []},
            embeds: [
                        {
                            title: null,
                            color: (!!good) ? 0x57f287 : 0xed4245,
                            description: `**Anonymity ${((!!good) ? "has joined" : "was kicked out of" )} \`${guild.name}\` which ${((!!good) ? "has" : "had" )} \`${guild.member_count}\` users${((!!good) ? "!" : "." )}**`,
                            fields: (!!detailed) ? [
                                { name: "owner ID", value: "↳ `"+guild.owner_id+"`", inline: true },
                                { name: "server ID", value: "↳ `"+guild.id+"`", inline: true },
                                { name: "preferred Locale", value: "↳ `"+guild.preferred_locale+"`" }
                            ] : [],
                            thumbnail: { url: (!!detailed) ? `${baseCDN_URL}/icons/${guild.id}/${guild.icon}.webp` : null }
                        }
            ]
        }),
        method: 'POST',
        headers: {'content-type': 'application/json;charset=UTF-8'}
    });
}

//types
type guildPartial = {
    id: string | undefined,
    icon: string | undefined,
    owner_id: string | undefined,
    member_count: number | undefined,
    name: string | undefined,
    preferred_locale: string | undefined
}
type channelPartial = {
    id: string | undefined,
    name?: string | undefined
}
type proto_discordWSS_URL_res = { url: string | undefined };
type d10 = {
    heartbeat_interval: number | undefined
}
type d2 = {
    id?: string | undefined
}
type WSpayload = {
    op: number | undefined,
    d?: ((object | string | number) & (d10 | d2 | ReadyEventField | boolean)) | undefined,
    s?: number | undefined,
    t?: string | undefined
}
type ReadyEventField = {
    v: number | undefined,
    user: {
        id: string | undefined,
        username: string | undefined,
        discriminator: string | undefined
    } | undefined,
    guilds: Array<guildPartial> | undefined,
    session_id: string | undefined,
    resume_gateway_url: string | undefined,
    shard?: [number | undefined, number | undefined] | undefined,
    application: object | undefined
}

//globals
let hearbeatID: number;
let heartbeatSeq: number | null = null;
let sessionCreds: ReadyEventField;
let resuming: boolean = false;

(async () => {
    const proto_discordWSS_URL = (await (await fetch(`${baseAPI_URL}/gateway`, {
        method: 'GET',
        body: null,
        headers: {}
    })).json() as proto_discordWSS_URL_res);

    if (!proto_discordWSS_URL.url) {
        console.log("[NO WS URL]");
        console.log(proto_discordWSS_URL);
        return;
    }
    let ws = new WebSocket(`${proto_discordWSS_URL.url}/?v=10&encoding=json`);


    ws.onopen = async () => {
        console.log("WS connected to Discord Gateway.");
        if (resuming) {
            console.log("[RESUMING]");
            ws.send(JSON.stringify({
                "op": 6,
                "d": {
                    "token": token,
                    "session_id": sessionCreds.session_id,
                    "seq": heartbeatSeq
                }
            }));
        }
    }

    ws.onclose = async event => {
        clearInterval(hearbeatID);
        if (event.code < 4010) {
            resuming = true;
            ws = new WebSocket(`${sessionCreds.resume_gateway_url}/?v=10&encoding=json`);
        } else {
            ws = new WebSocket(`${proto_discordWSS_URL.url}/?v=10&encoding=json`);
        }
    }

    ws.onmessage = async event => {
        let received = JSON.parse(event.data.toString()) as WSpayload;
        heartbeatSeq = received.s || heartbeatSeq || null;

        switch(received.op) {
            case 10: {
                console.log("[hello received from discord]");

                hearbeatID = setInterval(async () => {
                    console.log("[sending heartbeat]");
                    ws.send(JSON.stringify({
                        "op": 1,
	                    "d": heartbeatSeq
                    }));
                }, (received.d as d10).heartbeat_interval, heartbeatSeq);

                if (!resuming) {
                    ws.send(JSON.stringify({
                        op: 2,
                        d: {
                            token: token,
                            properties: {
                                os: "NetBSD",
                                browser: "curl",
                                device: "toaster"
                            },
                            presence: {
                                status: 'idle',
                            },
                            intents: 1
                        }
                    }));
                } else {
                    resuming = false;
                }

                break;
            }

            case 11: {
                console.log("[heartbeat acknowledged from discord]")
                break;
            }

            case 1: {
                console.log("[received heartbeat from discord]");

                ws.send(JSON.stringify({
                    "op": 1,
                    "d": heartbeatSeq
                }));
                console.log("[heartbeat acknowledgment sent]");
                break;
            }

            case 7: {
                console.log("[reconnect requested from discord]");

                resuming = true;
                clearInterval(hearbeatID);
                ws.close(1003);
                ws = new WebSocket(`${sessionCreds.resume_gateway_url}/?v=10&encoding=json`);
                break;
            }

            case 9: {
                if ((received.d as unknown as boolean) == true) {
                    resuming = true;
                    clearInterval(hearbeatID);
                    ws.close(1003);
                    ws = new WebSocket(`${sessionCreds.resume_gateway_url}/?v=10&encoding=json`);
                } else {
                    clearInterval(hearbeatID);
                    ws.close(1001);
                    ws = new WebSocket(`${proto_discordWSS_URL.url}/?v=10&encoding=json`);
                }
                break;
            }
        }

        switch(received.t) {
            case 'READY': {
                sessionCreds = received.d as ReadyEventField;
                if(!sessionCreds.user || !sessionCreds.guilds) {
                    console.log("[SESSION CREDS INCOMPLETE]");
                    return;
                }
                console.log(`[WS Gateway event connection for ${sessionCreds.user.username}#${sessionCreds.user.discriminator} is READY.]`);
                
                let guildCount = sessionCreds.guilds.length;
                console.log(`[SERVER COUNT: ${guildCount}]`);
                if (!(await editChannel(serverCountChannel, `SERVER COUNT: ${guildCount}`))) console.log("[COULD NOT UPDATE CHANNEL NAME.]");
                break;
            }

            case 'GUILD_CREATE': {
                let guild = received.d as guildPartial;
                if (!guild?.id) break;

                if(!sessionCreds.guilds) {
                    console.log("[SESSION CREDS INCOMPLETE]");
                    return;
                }

                if (!sessionCreds.guilds.find(gld => gld.id == guild.id)) {
                    console.log("[NEW GUILD]");
                    sessionCreds.guilds.push(guild);

                    let guildCount = sessionCreds.guilds.length;
                    if (!(await editChannel(serverCountChannel, `SERVER COUNT: ${guildCount}`))) console.log("[COULD NOT UPDATE CHANNEL NAME.]");
                    await sendHook(detailedHook, true, guild, true);
                    await sendHook(officialHook, true, guild, false);
                } else {
                    console.log("[OLD GUILD AVAILABLE]");
                }
                break;
            }

            case 'GUILD_DELETE': {
                console.log("[GUILD DELETED]");
                let guild = received.d as guildPartial;
                if (!guild.id) break;

                if(!sessionCreds.guilds) {
                    console.log("[SESSION CREDS INCOMPLETE]");
                    return;
                }

                let oldGuild = sessionCreds.guilds.find(gld => gld.id == guild.id);
                if (!!oldGuild) {
                    await sendHook(detailedHook, false, oldGuild, true);
                    await sendHook(officialHook, false, oldGuild, false);
                    sessionCreds.guilds = sessionCreds.guilds.filter( gld => gld.id != guild.id);
                }
                
                let guildCount = sessionCreds.guilds.length;
                console.log(`[SERVER COUNT: ${guildCount}]`);
                if (!(await editChannel(serverCountChannel, `SERVER COUNT: ${guildCount}`))) console.log("[COULD NOT UPDATE CHANNEL NAME.]");
                break;
            }
        }
    }
})();