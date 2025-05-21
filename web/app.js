/**
 * Webビンゴアプリケーションのメインロジック
 */
document.addEventListener('DOMContentLoaded', () => {
    // DOM要素
    const bingoCardElement = document.querySelector('.bingo-card');
    const lastNumberElement = document.getElementById('last-number');
    const recentNumbersElement = document.getElementById('recent-numbers');
    const statusMessageElement = document.getElementById('status-message');
    const newCardButton = document.getElementById('new-card-btn');
    const disconnectButton = document.getElementById('disconnect-btn');
    
    // ビンゴのサイズ設定
    const BINGO_MAX = 75;
    const BINGO_ROW = 5;
    const BINGO_COL = 5;
    
    // インスタンス生成
    const bingoLogic = new BingoLogic(BINGO_MAX, BINGO_ROW, BINGO_COL);
    const mqttClient = new MQTTClient();
    
    // MQTT接続設定
    const mqttConfig = {
        broker: "broker.emqx.io",
        port: 8083, // WebSocketsポート（WebブラウザではWSS/WSのみ使用可能）
        topic: "net.syamoji/bingo/card2"
    };
    
    // 選択された数字の履歴（最新のものが最初）
    let numberHistory = [];
    
    /**
     * ビンゴカードの生成と描画
     */
    function initBingoCard() {
        // ビンゴカードのロジック初期化
        bingoLogic.initBingoCard();
        bingoLogic.openCenterAsFree();
        
        // UIに反映
        renderBingoCard();
    }
    
    /**
     * ビンゴカードをUIに描画
     */
    function renderBingoCard() {
        // 既存の内容をクリア
        bingoCardElement.innerHTML = '';
        
        // 各セルを生成
        for (let row = 0; row < BINGO_ROW; row++) {
            for (let col = 0; col < BINGO_COL; col++) {
                const cell = document.createElement('div');
                cell.className = 'bingo-cell';
                
                // 数値またはマーク
                const cellValue = bingoLogic.bingoCardData[row][col];
                
                // マークされているか判定
                if (cellValue === '●') {
                    cell.classList.add('marked');
                    cell.textContent = '';
                } else {
                    cell.textContent = cellValue;
                    
                    // 引かれた数字かどうか判定
                    if (bingoLogic.choicedNum.includes(cellValue)) {
                        cell.classList.add('marked');
                    }
                }
                
                // 中央のフリースペース
                if (row === Math.floor(BINGO_ROW / 2) && col === Math.floor(BINGO_COL / 2)) {
                    cell.classList.add('free');
                    if (cellValue !== '●') {
                        cell.classList.add('marked');
                    }
                }
                
                // クリックイベント
                cell.addEventListener('click', () => {
                    handleCellClick(row, col);
                });
                
                bingoCardElement.appendChild(cell);
            }
        }
    }
    
    /**
     * セルクリック時の処理
     */
    function handleCellClick(row, col) {
        const cellValue = bingoLogic.bingoCardData[row][col];
        
        // マークされているセルはクリック無効
        if (cellValue === '●') return;
        
        // 選択された数字がMQTTで配信された数字に含まれるか確認
        if (bingoLogic.choicedNum.includes(cellValue)) {
            // マークする
            bingoLogic.markCell(row, col);
            
            // ビンゴ判定
            const bingoResult = bingoLogic.checkBingo();
            
            // カード再描画
            renderBingoCard();
            
            // ビンゴの場合
            if (bingoResult) {
                celebrateBingo(bingoResult);
            }
        } else {
            // まだ選ばれていない数字
            statusMessageElement.textContent = `まだ「${cellValue}」は選ばれていません`;
        }
    }
    
    /**
     * ビンゴ達成時のお祝い処理
     */
    function celebrateBingo(bingoResult) {
        statusMessageElement.textContent = 'BINGO!!!';
        statusMessageElement.classList.add('bingo-highlight');
        
        // ハイライト処理
        const cells = document.querySelectorAll('.bingo-cell');
        
        if (bingoResult.type === 'row') {
            // 行ビンゴ
            const rowStart = bingoResult.index * BINGO_COL;
            for (let i = 0; i < BINGO_COL; i++) {
                cells[rowStart + i].classList.add('bingo-highlight');
            }
        } 
        else if (bingoResult.type === 'col') {
            // 列ビンゴ
            for (let i = 0; i < BINGO_ROW; i++) {
                cells[i * BINGO_COL + bingoResult.index].classList.add('bingo-highlight');
            }
        }
        else if (bingoResult.type === 'diagonal') {
            if (bingoResult.index === 1) {
                // 左上から右下
                for (let i = 0; i < BINGO_ROW; i++) {
                    cells[i * BINGO_COL + i].classList.add('bingo-highlight');
                }
            } else {
                // 右上から左下
                for (let i = 0; i < BINGO_ROW; i++) {
                    cells[i * BINGO_COL + (BINGO_COL - 1 - i)].classList.add('bingo-highlight');
                }
            }
        }
    }
    
    /**
     * 引かれた数字の表示を更新
     */
    function updateNumberDisplay() {
        // 最新の数字
        if (numberHistory.length > 0) {
            lastNumberElement.textContent = numberHistory[0];
        } else {
            lastNumberElement.textContent = '-- 準備中 --';
        }
        
        // 最近の数字履歴（最新5つ）
        recentNumbersElement.innerHTML = '';
        
        // 先頭は除く（すでに大きく表示されているため）
        const historyToShow = numberHistory.slice(1, 6);
        
        historyToShow.forEach(num => {
            const numElement = document.createElement('div');
            numElement.className = 'recent-number';
            numElement.textContent = num;
            recentNumbersElement.appendChild(numElement);
        });
    }
    
    /**
     * MQTTからのメッセージ処理
     */
    function handleMqttMessage(data) {
        try {
            // 引かれた数字のリストを更新
            bingoLogic.choicedNum = [...data];
            
            // 最新の数字を履歴の先頭に追加
            if (data.length > 0 && (numberHistory.length === 0 || data[data.length - 1] !== numberHistory[0])) {
                numberHistory.unshift(data[data.length - 1]);
                
                // 表示の更新
                updateNumberDisplay();
                
                // ビンゴカードの更新
                renderBingoCard();
                
                // 状態メッセージ
                statusMessageElement.textContent = `新しい数字: ${numberHistory[0]}`;
                statusMessageElement.classList.remove('bingo-highlight');
            }
        } catch (error) {
            console.error("メッセージ処理エラー:", error);
            statusMessageElement.textContent = "メッセージ処理中にエラーが発生しました";
        }
    }
    
    /**
     * MQTT接続処理
     */
    async function connectMQTT() {
        try {
            // MQTT設定の適用
            mqttClient.setConfig(mqttConfig);
            
            // 接続時のコールバック
            mqttClient.setOnConnectCallback(() => {
                statusMessageElement.textContent = "接続成功！数字を待っています...";
                disconnectButton.disabled = false;
            });
            
            // 切断時のコールバック
            mqttClient.setOnDisconnectCallback(() => {
                statusMessageElement.textContent = "切断されました。再接続するには更新してください。";
                disconnectButton.disabled = true;
            });
            
            // メッセージ受信時のコールバック
            mqttClient.setOnMessageCallback(handleMqttMessage);
            
            // 接続
            await mqttClient.connect();
        } catch (error) {
            console.error("MQTT接続エラー:", error);
            statusMessageElement.textContent = "MQTTサーバーに接続できませんでした";
        }
    }
    
    /**
     * 初期化とイベントリスナー設定
     */
    function init() {
        // ビンゴカード初期化
        initBingoCard();
        
        // MQTT接続
        connectMQTT();
        
        // 新しいカードボタンイベント
        newCardButton.addEventListener('click', () => {
            // 確認
            if (confirm("新しいカードを生成しますか？")) {
                initBingoCard();
                statusMessageElement.textContent = "新しいカードを生成しました";
                statusMessageElement.classList.remove('bingo-highlight');
            }
        });
        
        // 切断ボタンイベント
        disconnectButton.addEventListener('click', () => {
            if (confirm("サーバーから切断しますか？")) {
                mqttClient.disconnect();
                statusMessageElement.textContent = "サーバーから切断しました";
                disconnectButton.disabled = true;
            }
        });
    }
    
    // アプリケーション初期化
    init();
});
