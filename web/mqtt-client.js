/**
 * MQTT接続とメッセージ処理を管理するクラス
 * Pythonの lib/mqtt_logic.py を JavaScript に移植
 */
class MQTTClient {
    /**
     * @param {string} broker - MQTTブローカーのホスト名
     * @param {number} port - MQTTブローカーのポート番号
     * @param {string} topic - 購読するトピック名
     */
    constructor(broker = "wss://broker.emqx.io", port = 8084, topic = "net.syamoji/bingo/card2") {
        this.broker = broker;
        this.port = port;
        this.topic = topic;
        this.client = null;
        this.connected = false;
        this.onMessageCallback = null;
        this.onConnectCallback = null;
        this.onDisconnectCallback = null;
        this.clientId = "bingoClient_" + Math.random().toString(16).substr(2, 8);
    }

    /**
     * MQTT設定を適用
     * @param {Object} config - MQTT設定オブジェクト
     */
    setConfig(config) {
        if (config.broker) this.broker = config.broker;
        if (config.port) this.port = config.port;
        if (config.topic) this.topic = config.topic;
    }

    /**
     * MQTTブローカーに接続
     * @returns {Promise} 接続成功時に解決するPromise
     */
    connect() {
        return new Promise((resolve, reject) => {
            try {
                // WebSocketを使用するMQTTクライアントを作成
                // Eclipse Paho 1.0.1ではPaho.MQTTではなくPaho.MQTTというネームスペースは使われていない
                this.client = new Paho.MQTT.Client(
                    this.broker, 
                    Number(this.port),
                    this.clientId
                );

                // コールバック設定
                this.client.onConnectionLost = this.onConnectionLost.bind(this);
                this.client.onMessageArrived = this.onMessageArrived.bind(this);

                // 接続オプション
                const options = {
                    onSuccess: () => {
                        console.log("MQTT ブローカーに接続しました!");
                        this.connected = true;
                        
                        // トピック購読
                        this.subscribe();
                        
                        if (this.onConnectCallback) this.onConnectCallback();
                        resolve();
                    },
                    onFailure: (err) => {
                        console.error("MQTT 接続に失敗しました:", err);
                        reject(err);
                    },
                    useSSL: this.port === 8883, // SSLポートの場合
                    timeout: 3,
                };

                // 接続
                this.client.connect(options);
            } catch (error) {
                console.error("MQTT接続エラー:", error);
                reject(error);
            }
        });
    }

    /**
     * 切断時のコールバック
     * @param {Object} responseObject - 切断情報 
     */
    onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log("接続が切断されました:", responseObject.errorMessage);
            this.connected = false;
            
            if (this.onDisconnectCallback) this.onDisconnectCallback(responseObject);
        }
    }

    /**
     * メッセージ受信時のコールバック
     * @param {Object} message - 受信したメッセージ
     */
    onMessageArrived(message) {
        console.log("メッセージを受信:", message.payloadString);
        
        try {
            // 文字列をJSONに変換（Pythonのリスト形式を想定）
            const messageStr = message.payloadString;
            const cleanStr = messageStr.replace(/'/g, '"');
            const data = JSON.parse(cleanStr);
            
            if (this.onMessageCallback) {
                this.onMessageCallback(data);
            }
        } catch (error) {
            console.error("メッセージのパースに失敗:", error);
        }
    }

    /**
     * トピックを購読
     */
    subscribe() {
        if (!this.connected || !this.client) {
            console.error("購読できません: 未接続です");
            return;
        }
        
        this.client.subscribe(this.topic, {
            qos: 0,
            onSuccess: () => {
                console.log(`トピック '${this.topic}' を購読中...`);
            },
            onFailure: (err) => {
                console.error(`トピック購読エラー: ${err}`);
            }
        });
    }

    /**
     * メッセージを発行
     * @param {Array|Object} message - 送信するメッセージ
     */
    publish(message) {
        if (!this.connected || !this.client) {
            console.error("メッセージを発行できません: 未接続です");
            return;
        }
        
        // メッセージをJSON文字列化
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        
        try {
            // Eclipse Paho 1.0.1用のメッセージ作成方法
            const mqttMessage = new Paho.MQTT.Message(messageStr);
            mqttMessage.destinationName = this.topic;
            mqttMessage.qos = 0;
            mqttMessage.retained = false;
            
            this.client.send(mqttMessage);
            console.log(`メッセージを発行: ${messageStr}`);
        } catch (error) {
            console.error("メッセージ発行エラー:", error);
        }
    }

    /**
     * MQTTブローカーから切断
     */
    disconnect() {
        if (this.client && this.connected) {
            this.client.disconnect();
            this.connected = false;
            console.log("MQTT ブローカーから切断しました");
        }
    }

    /**
     * メッセージ受信時のコールバックを設定
     * @param {Function} callback - コールバック関数
     */
    setOnMessageCallback(callback) {
        this.onMessageCallback = callback;
    }

    /**
     * 接続時のコールバックを設定
     * @param {Function} callback - コールバック関数
     */
    setOnConnectCallback(callback) {
        this.onConnectCallback = callback;
    }

    /**
     * 切断時のコールバックを設定
     * @param {Function} callback - コールバック関数
     */
    setOnDisconnectCallback(callback) {
        this.onDisconnectCallback = callback;
    }
}
