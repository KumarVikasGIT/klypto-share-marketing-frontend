# WebSocket Usage Documentation

This document outlines the entire WebSocket infrastructure, event dictionary, and component-level usage within the Klypto Share Marketing Frontend application.

## 1. Connection Architecture

The application uses two primary patterns for managing WebSocket connections:

1. **Centralized Manager (`socketManager.js` & `useSocket.js`)**
   - The application maintains a single, singleton socket connection via `socketManager.js`.
   - Components interact with this connection using the `useSocket` React hook. 
   - `useSocket` maps incoming socket events to component callback props (e.g., `handleLiveTick`, `handleStockUpdate`) and caches payload data in a `globalCache` to survive route transitions.

2. **Ad-Hoc Connections (`io(SOCKET_URL)`)**
   - Certain independent panels (like **OptionChain** and **OIAnalytics**) create their own isolated Socket.IO connections to manage their high-frequency subscriptions without polluting the main channel.

---

## 2. Event Dictionary

All event strings are centralized in `src/services/websocket/socketEvent.js` under the `EVENTS` object.

### Chart Events (`EVENTS.CHART`)
| Constant | Event Name | Direction | Description |
|---|---|---|---|
| `GET` | `getManualHistoricalData` | Client → Server | Requests historical OHLCV candle data for a timeframe. |
| `RESPONSE` | `historicalDataResponse` | Server → Client | Returns the historical candle data payload. |
| `ERROR` | `historicalDataError` | Server → Client | Emitted if historical data fetching fails. |
| `LIVETICKS` | `liveticks` | Server → Client | Streams real-time price updates (ticks) for the active chart symbol. |

### Indicator Events (`EVENTS.INDICATOR`)
| Constant | Event Name | Direction | Description |
|---|---|---|---|
| `GET` | `getIndicatorDetails` | Client → Server | Requests configuration/data for a specific technical indicator. |
| `RESPONSE` | `indicatorDetailsResponse` | Server → Client | Returns the requested indicator details. |
| `ERROR` | `indicatorDetailsError` | Server → Client | Emitted if indicator computation fails. |
| `LIVE` | `getLiveIndicatorUpdate` | Client → Server | Subscribes to real-time updates for an indicator. |
| `LIVE_RESPONSE`| `liveIndicatorResponse` | Server → Client | Streams real-time calculated values for active indicators. |
| `UPDATE_RESPONSE`|`updateIndicatorResponse`| Server → Client | Response for an indicator parameter update. |

### Alerts (`EVENTS.ALERTS`)
| Constant | Event Name | Direction | Description |
|---|---|---|---|
| `TRIGGERED` | `alertTriggered` | Server → Client | Fired when a user-defined price or indicator alert condition is met. |

### Stock List & Watchlist (`EVENTS.STOCK_LIST` / `WATCHLIST`)
| Constant | Event Name | Direction | Description |
|---|---|---|---|
| `STOCKS_LIST` | `stocks` | Server → Client | Returns the full directory/list of tradable symbols. |
| `STOCK_UPDATE`| `stockUpdate` | Server → Client | Streams real-time updates for individual stocks (LTP changes). |
| `GET` | `getMasterWatchlist` | Client → Server | Requests the user's saved watchlist. |
| `RESPONSE` | `masterWatchlistResponse` | Server → Client | Returns the watchlist array. |

### Option Chain (`EVENTS.OPTION_CHAIN`)
| Constant | Event Name | Direction | Description |
|---|---|---|---|
| `LIST` | `live-options-list` | Server → Client | Returns available expiries and symbol groupings for options. |
| `GET` | `set-filter` | Client → Server | Subscribes to a specific Option Chain (e.g., NIFTY, Expiry Date). |
| `RESPONSE` | `option-chain-data` | Server → Client | Streams real-time Greeks, OI, Volume, and LTP for the requested chain. |

### Overview & Strategy (`EVENTS.OVERVIEW` / `STRATEGY`)
| Constant | Event Name | Direction | Description |
|---|---|---|---|
| `GET` | `getLiveTick` | Client → Server | Requests overview data (Market Depth, Circuits, Performance). |
| `RESPONSE` | `strategyLiveTick` | Server → Client | Streams real-time overview panel data. |
| `PROGRESS` | `scannerProgress` | Server → Client | Streams progress percentage of a running market scanner/screener. |
| `NEW_SIGNAL` | `newScannerSignal` | Server → Client | Fired when a scanner finds a stock matching strategy criteria. |
| `COMPLETE` | `scannerComplete` | Server → Client | Fired when a scanner finishes its run. |
| `ERROR` | `scannerError` | Server → Client | Fired if a scanner fails. |

---

## 3. Component Usage Map

Here is a breakdown of how key components utilize these socket events:

### `CandleStick.jsx` (Main Chart)
- **Uses**: `useSocket`
- **Emits**: `getManualHistoricalData`, `getIndicatorDetails`
- **Listens To**: `historicalDataResponse`, `liveticks`, `indicatorDetailsResponse`, `liveIndicatorResponse`
- **Behavior**: Manages the main trading view. It requests historical data on mount/symbol change, then applies real-time `liveticks` to the last candle. Does the same for technical indicators.

### `OptionChain.jsx` & `OIAnalytics.jsx`
- **Uses**: Ad-Hoc `io(SOCKET_URL)`
- **Emits**: `set-filter`
- **Listens To**: `live-options-list` (OptionChain only), `option-chain-data`
- **Behavior**: These panels create independent connections to manage the heavy payload of options data. They emit `set-filter` whenever the user changes the expiry date or symbol, and hydrate their UI from the `option-chain-data` stream.

### `Overview.jsx`
- **Uses**: `useSocket`
- **Emits**: `getAllStocks`, `getLiveTick`
- **Listens To**: `strategyLiveTick` (Mapped via `useSocket`'s `handleLiveTick` prop)
- **Behavior**: Fetches market depth and daily metrics for the selected symbol on the right-side panel.

### `LeftWatchlist.jsx`
- **Uses**: `useSocket`
- **Emits**: `getMasterWatchlist`
- **Listens To**: `masterWatchlistResponse`, `stocks`, `stockUpdate`
- **Behavior**: Renders the left sidebar. It listens to global stock updates and flashes green/red based on price ticks.

### `useAlerts.js` (Background Hook)
- **Uses**: `useSocket`
- **Listens To**: `stocks`, `stockUpdate`, `liveticks`, `liveIndicatorResponse`
- **Behavior**: Runs silently in the background, intercepting price ticks and indicator updates to evaluate user-defined alert conditions.
