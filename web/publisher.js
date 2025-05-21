/**
 * ビンゴ番号発行機能のメインロジック
 */
document.addEventListener('DOMContentLoaded', () => {
    // DOM要素
    const currentNumberElement = document.getElementById('current-number');
    const pickCountElement = document.getElementById('pick-count');
    const totalNumbersElement = document.getElementById('total-numbers');
    const numberHistoryElement = document.getElementById('number-history');
    const statusMessageElement = document.getElementById('status-message');
    const pickNumberButton = document.getElementById('pick-number-btn');
    const resetButton = document.getElementById('reset-btn');
    
    // ビンゴのサイズ設定
    const BINGO_MAX = 75;
    
    // インスタンス生成
    const bingoLogic = new BingoLogic(BINGO_MAX);
    const mqttClient = new MQTTClient();
    
    // MQTT接続設定
    const mqttConfig = {
        broker: "broker.emqx.io",
        port: 8083, // WebSocketsポート
        topic: "net.syamoji/bingo/card2"
    };
    
    /**
     * 引かれた番号の履歴を表示
     */
    function renderNumberHistory() {
        numberHistoryElement.innerHTML = '';
        
        bingoLogic.choicedNum.slice().reverse().forEach(num => {
            const numElement = document.createElement('div');
            numElement.className = 'history-number';
            numElement.textContent = num;
            numberHistoryElement.appendChild(numElement);
        });
        
        // カウント表示更新
        pickCountElement.textContent = bingoLogic.choicedNum.length;
        totalNumbersElement.textContent = BINGO_MAX;
    }
    
    /**
     * 新しい番号を引く
     */
    function pickNewNumber() {
        // すべての番号が引かれた場合
        if (bingoLogic.bingoCandidate.length === 0) {
            statusMessageElement.textContent = "すべての番号が引かれました！";
            pickNumberButton.disabled = true;
            return;
        }
        
        // 番号を引く
        const newNumber = bingoLogic.pickNumber();
        
        // 表示を更新
        currentNumberElement.textContent = newNumber;
        currentNumberElement.classList.add('number-pop');
        
        // アニメーション終了後にクラスを削除
        setTimeout(() => {
            currentNumberElement.classList.remove('number-pop');
        }, 500);
        
        // 履歴表示を更新
        renderNumberHistory();
        
        // MQTTで配信
        mqttClient.publish(bingoLogic.choicedNum);
        
        // 状態メッセージ
        statusMessageElement.textContent = `番号「${newNumber}」を配信しました`;
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
                statusMessageElement.textContent = "接続成功！";
                pickNumberButton.disabled = false;
                resetButton.disabled = false;
            });
            
            // 切断時のコールバック
            mqttClient.setOnDisconnectCallback(() => {
                statusMessageElement.textContent = "切断されました。再接続するには更新してください。";
                pickNumberButton.disabled = true;
                resetButton.disabled = true;
            });
            
            // 接続
            await mqttClient.connect();
        } catch (error) {
            console.error("MQTT接続エラー:", error);
            statusMessageElement.textContent = "MQTTサーバーに接続できませんでした";
            pickNumberButton.disabled = true;
            resetButton.disabled = true;
        }
    }
    
    /**
     * ゲームをリセット
     */
    function resetGame() {
        if (!confirm("本当にリセットしますか？これまでの番号履歴はすべて消去されます。")) {
            return;
        }
        
        // ビンゴロジックをリセット
        bingoLogic.bingoCandidate = Array.from({ length: BINGO_MAX }, (_, i) => i + 1);
        bingoLogic.choicedNum = [];
        bingoLogic.bingoFinish = false;
        
        // 表示をリセット
        currentNumberElement.textContent = "--";
        renderNumberHistory();
        
        // MQTTで空の配列を配信
        mqttClient.publish([]);
        
        // ボタンを有効化
        pickNumberButton.disabled = false;
        
        // 状態メッセージ
        statusMessageElement.textContent = "ゲームをリセットしました";
    }
    
    /**
     * 初期化とイベントリスナー設定
     */
    function init() {
        // 初期化
        bingoLogic.initBingoCard();
        bingoLogic.choicedNum = [];
        
        // MQTT接続
        connectMQTT();
        
        // 番号を引くボタンイベント
        pickNumberButton.addEventListener('click', pickNewNumber);
        
        // リセットボタンイベント
        resetButton.addEventListener('click', resetGame);
        
        // 初期状態ではボタンを無効化
        pickNumberButton.disabled = true;
        resetButton.disabled = true;
        
        // 初期表示
        renderNumberHistory();
    }
    
    // アプリケーション初期化
    init();
});
