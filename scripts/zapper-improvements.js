// ==UserScript==
// @name         Zapper++
// @namespace    https://base32.org/
// @version      0.1
// @description  Fetches validator rewards from custom API and adds them to your zapper balance
// @author       ExtraHash
// @invlude        https://zapper.fi*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=zapper.fi
// @grant        none
// ==/UserScript==

let totalBal = 0;

async function main() {
    addPriceSpanToHeader();
    modifyBalances();
    listenToSocket();
}

async function listenToSocket() {
    const ws = new WebSocket("wss://base32.org/api/eth/price");
    ws.onopen = () => {
        console.log("websocket is listening");
    };
    ws.onmessage = (msg) => {
        const priceInfo = JSON.parse(msg.data);
        console.log(priceInfo);
        updateEthPrice(priceInfo);
        setUsdBal(priceInfo);
    };
}

function prettyNumber(x) {
    return x.toFixed(2).replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

function setUsdBal(priceInfo) {
    const usdBal = document.getElementById("usd-bal-span");

    if (!usdBal) {
        return;
    }

    usdBal.textContent = `$${prettyNumber(totalBal * priceInfo.last)}`;
}

async function getEthPrice() {
    // fetch eth price
    const priceRes = await fetch("https://base32.org/api/eth/price");
    return priceRes.json();
}

async function addPriceSpanToHeader() {
    const ethPrice = await getEthPrice();
    const links = document.getElementsByTagName("a");
    for (const link of links) {
        if (link.href.includes("/dashboard")) {
            const newLink = link.cloneNode(true);
            newLink.id = "eth-header-price-wrapper";

            // set text and styling
            const [ethPriceTextSpan] = newLink.getElementsByTagName("span");
            ethPriceTextSpan.id = "eth-header-price-text";
            ethPriceTextSpan.textContent = "";
            // set image
            const [img] = newLink.getElementsByTagName("img");
            img.src = "https://zapper.fi/images/networks/ethereum-icon.png";

            const percentSpan = document.createElement("span");
            percentSpan.id = "eth-24h-price-change";
            percentSpan.style.fontSize = "small";
            percentSpan.style.marginLeft = "0.77rem";
            percentSpan.style.marginTop = "2.5px";

            percentSpan.style.color =
                ethPrice.percentage < 0
                    ? "rgb(236, 140, 212)"
                    : "rgb(57, 255, 185)";
            percentSpan.textContent = `${ethPrice.percentage.toFixed(2)}%`;
            ethPriceTextSpan.parentElement.appendChild(percentSpan);
            link.parentElement.prepend(newLink);
            break;
        }
    }

    updateEthPrice(ethPrice);
}

async function updateEthPrice(priceInfo) {
    const ethPriceText = document.getElementById("eth-header-price-text");
    if (!ethPriceText) {
        return;
    }
    ethPriceText.textContent = `$${prettyNumber(priceInfo.last)}`;
    const percentSpan = document.getElementById("eth-24h-price-change");
    if (!percentSpan) {
        return;
    }
    percentSpan.textContent = `${priceInfo.percentage.toFixed(2)}%`;
    percentSpan.style.color =
        priceInfo.percentage < 0 ? "rgb(236, 140, 212)" : "rgb(57, 255, 185)";
}

const sleep = async (ms) => new Promise((res) => setTimeout(res, ms));

async function modifyBalances() {
    "use strict";

    // fetch validator balance from custom api
    const balRes = await fetch(
        "https://base32.org/api/eth/validator-balance/90016445a797bb81f131146df66e094271f7df43e82603c51180a83c76f283060611967972f327b0b4566097f608dc8d"
    );
    const { balance } = await balRes.json();
    const rewards = balance - 32;

    const unwrapRateRes = await fetch(
        "https://api-public.sandbox.pro.coinbase.com/wrapped-assets/CBETH/conversion-rate"
    );
    const unwrapData = await unwrapRateRes.json();
    const unwrapRate = unwrapData.amount;

    console.log(unwrapRate);

    // fetch eth price
    const priceRes = await fetch("https://base32.org/api/eth/price");
    const priceInfo = await priceRes.json();

    console.log("fetched info", priceInfo);

    await sleep(200);

    // wait while loading spinner is pbalResent
    let exists = document.getElementsByClassName("lds-dual-ring");
    let timeout = 1;
    while (exists.length === 1) {
        await sleep(1);
        timeout *= 2;
        exists = document.getElementsByClassName("lds-dual-ring");
    }

    console.log("loaded");

    // fetching the current ether balance from zapper
    const balElement = document.querySelector('[data-testid="1"]');
    const currentBal = Number(balElement.textContent.replace(/[^\d.]/g, ""));

    console.log("current balance: " + currentBal);
    console.log("rewards: " + rewards);

    // increase relevant balances
    totalBal = currentBal;

    console.log("total balance: " + totalBal);
    balElement.textContent = `?? ${prettyNumber(totalBal)}`;

    // add usd balance
    const usdBalSpan = document.createElement("span");

    usdBalSpan.id = "usd-bal-span";
    usdBalSpan.style.fontSize = "medium";
    usdBalSpan.style.float = "right";
    usdBalSpan.style.marginTop = "7px";
    usdBalSpan.style.marginRight = "10px";

    console.log(balElement, usdBalSpan);

    balElement.appendChild(usdBalSpan);
    setUsdBal(priceInfo);

    const links = document.getElementsByTagName("a");
    for (const link of links) {
        if (link.href.includes("ethereum-staking")) {
            // the one we're after has child nodes
            if (link.hasChildNodes) {
                const spans = link.getElementsByTagName("span");
                for (const span of spans) {
                    if (span.textContent.includes("??")) {
                        span.textContent = `?? ${prettyNumber(balance)}`;
                    }
                }
            }
        }
    }
}

main();
