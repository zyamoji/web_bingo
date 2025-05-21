/**
 * ビンゴロジックを管理するクラス
 * Pythonの lib/bingo_logic.py を JavaScript に移植
 */
class BingoLogic {
    /**
     * @param {number} bingoMax - ビンゴの最大数（デフォルト: 75）
     * @param {number} bingoRow - ビンゴカードの行数（デフォルト: 5）
     * @param {number} bingoCol - ビンゴカードの列数（デフォルト: 5）
     */
    constructor(bingoMax = 75, bingoRow = 5, bingoCol = 5) {
        this.bingoMax = bingoMax;
        this.bingoRow = bingoRow;
        this.bingoCol = bingoCol;
        this.bingoCardData = [];
        this.bingoCandidate = [];
        this.choicedNum = [];
        this.bingoFinish = false;
        this.bingoChoice = 0;
        this.bingoHit = false;
    }

    /**
     * 中央をフリースペースにする
     */
    openCenterAsFree() {
        // 中央の添字を計算で出す
        const centerRow = Math.floor(this.bingoRow / 2);
        const centerCol = Math.floor(this.bingoCol / 2);
        this.bingoCardData[centerRow][centerCol] = "●";
    }

    /**
     * ビンゴカードを初期化する
     * @returns {Array} 初期化されたビンゴカードデータ
     */
    initBingoCard() {
        // ビンゴで引かれる数
        this.bingoCandidate = Array.from({ length: this.bingoMax }, (_, i) => i + 1);
        // 選ばれた数
        this.choicedNum = [];
        this.bingoFinish = false;
        
        // 列を作る - 複数の数字範囲から選ぶ
        // B列: 1-15, I列: 16-30, N列: 31-45, G列: 46-60, O列: 61-75
        const bingoColData = [];
        
        // B I N G O の各列を作成
        bingoColData.push(this.getRandomNumbers(1, 15, this.bingoRow));
        bingoColData.push(this.getRandomNumbers(16, 30, this.bingoRow));
        bingoColData.push(this.getRandomNumbers(31, 45, this.bingoRow));
        bingoColData.push(this.getRandomNumbers(46, 60, this.bingoRow));
        bingoColData.push(this.getRandomNumbers(61, 75, this.bingoRow));

        // 列データから数字を拾って二次元にしてカードを作る
        this.bingoCardData = [];
        for (let rowNum = 0; rowNum < this.bingoRow; rowNum++) {
            const tmpBingoRowData = [];
            for (let colNum = 0; colNum < this.bingoCol; colNum++) {
                tmpBingoRowData.push(bingoColData[colNum][rowNum]);
            }
            this.bingoCardData.push(tmpBingoRowData);
        }

        return this.bingoCardData;
    }

    /**
     * min から max までの範囲からランダムな数字を count 個取得
     * @param {number} min - 最小値
     * @param {number} max - 最大値
     * @param {number} count - 取得する数の個数
     * @returns {Array} ランダムな数字の配列
     */
    getRandomNumbers(min, max, count) {
        const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        const result = [];
        
        // Fisher-Yatesシャッフル
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
        
        return numbers.slice(0, count);
    }

    /**
     * 数字を引く
     */
    pickNumber() {
        if (this.bingoFinish) {
            console.log("あがり！");
            return;
        }

        if (this.bingoCandidate.length === 0) {
            console.log("すべての数字が引かれました");
            return;
        }

        // 数字を出して開けていく
        const randomIndex = Math.floor(Math.random() * this.bingoCandidate.length);
        this.bingoChoice = this.bingoCandidate[randomIndex];
        this.choicedNum.push(this.bingoChoice);
        this.bingoCandidate.splice(randomIndex, 1);
        
        console.log(`${this.bingoChoice}が選ばれました。残り${this.bingoCandidate.length}個`);
        return this.bingoChoice;
    }

    /**
     * 指定した数値がカード上にあるか確認
     * @param {number} number - 確認する数値
     * @returns {Object|null} ヒットした場合は位置情報、無い場合はnull
     */
    checkNumberOnCard(number) {
        for (let row = 0; row < this.bingoRow; row++) {
            for (let col = 0; col < this.bingoCol; col++) {
                if (this.bingoCardData[row][col] === number) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    /**
     * 指定した位置のセルを開ける
     * @param {number} row - 行インデックス
     * @param {number} col - 列インデックス
     */
    markCell(row, col) {
        this.bingoCardData[row][col] = "●";
    }

    /**
     * ビンゴ判定を行う
     * @returns {Array|null} ビンゴになった場合はその位置情報、ならない場合はnull
     */
    checkBingo() {
        // ビンゴ判定
        // 行のチェック
        for (let row = 0; row < this.bingoRow; row++) {
            const rowData = this.bingoCardData[row];
            if (new Set(rowData).size === 1) {
                console.log("行ビンゴ！");
                this.bingoFinish = true;
                return { type: 'row', index: row };
            }
        }
        
        // 列のチェック
        for (let col = 0; col < this.bingoCol; col++) {
            const colData = [];
            for (let row = 0; row < this.bingoRow; row++) {
                colData.push(this.bingoCardData[row][col]);
            }
            
            if (new Set(colData).size === 1) {
                console.log("列ビンゴ！");
                this.bingoFinish = true;
                return { type: 'col', index: col };
            }
        }
        
        // 斜めのチェック (左上から右下)
        const diagonal1 = [];
        for (let i = 0; i < this.bingoRow; i++) {
            diagonal1.push(this.bingoCardData[i][i]);
        }
        
        if (new Set(diagonal1).size === 1) {
            console.log("斜めビンゴ！ (左上から右下)");
            this.bingoFinish = true;
            return { type: 'diagonal', index: 1 };
        }
        
        // 斜めのチェック (右上から左下)
        const diagonal2 = [];
        for (let i = 0; i < this.bingoRow; i++) {
            diagonal2.push(this.bingoCardData[i][this.bingoCol - i - 1]);
        }
        
        if (new Set(diagonal2).size === 1) {
            console.log("斜めビンゴ！ (右上から左下)");
            this.bingoFinish = true;
            return { type: 'diagonal', index: 2 };
        }
        
        // ビンゴなし
        return null;
    }
}
