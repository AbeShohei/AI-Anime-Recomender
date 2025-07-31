document.addEventListener('DOMContentLoaded', () => {
    const surveyForm = document.getElementById('surveyForm');
    const messageArea = document.getElementById('messageArea');

    // フォーム送信時の処理
    surveyForm.addEventListener('submit', (event) => {
        event.preventDefault();
        messageArea.textContent = '';
        messageArea.className = 'message';

        try {
            const formData = new FormData(surveyForm);
            const answers = {};
            const qKeys = ['q1_feeling', 'q2_focus', 'q3_plot', 'q4_setting', 'q5_partner'];
            let allAnswered = true;
            qKeys.forEach(key => {
                answers[key] = formData.get(key);
                if (!answers[key]) allAnswered = false;
            });

            if (!allAnswered) throw new Error("すべての質問に回答してください。");

            // 回答に基づいて好みのジャンルを推測 (英語で)
            const inferredGenres = inferGenresFromAnswers(answers);
            console.log("推測された英語ジャンル:", inferredGenres);

            // 推測されたジャンルリスト(英語)をLocalStorageに保存
            localStorage.setItem('userAnimeGenres', JSON.stringify(inferredGenres));

            messageArea.textContent = '診断結果を保存しました！おすすめページで結果を確認してください。';
            messageArea.classList.add('success');

        } catch (error) {
            console.error("アンケート保存エラー:", error);
            messageArea.textContent = `エラー: ${error.message}`;
            messageArea.classList.add('error');
        }
    });

    // ページ読み込み時にメッセージ表示のみ
    const savedGenres = localStorage.getItem('userAnimeGenres');
    if (savedGenres) {
         messageArea.textContent = '前回の診断結果が保存されています。再診断すると上書きされます。';
         messageArea.classList.add('success');
         setTimeout(() => messageArea.textContent = '', 4000);
    }
});

// 回答から好みのジャンル(英語)を推測する関数
function inferGenresFromAnswers(answers) {
    const inferred = new Set();
    // Q1
    switch (answers.q1_feeling) {
        case 'A': inferred.add('Drama'); inferred.add('Romance'); inferred.add('Slice of Life'); break;
        case 'B': inferred.add('Action'); inferred.add('Adventure'); inferred.add('Sports'); inferred.add('Super Power'); break;
        case 'C': inferred.add('Comedy'); inferred.add('Parody'); inferred.add('Slice of Life'); break;
        case 'D': inferred.add('Mystery'); inferred.add('Sci-Fi'); inferred.add('Fantasy'); inferred.add('Supernatural'); inferred.add('Psychological'); break;
        case 'E': inferred.add('Horror'); inferred.add('Thriller'); inferred.add('Mystery'); inferred.add('Psychological'); break;
    }
    // Q2
    switch (answers.q2_focus) {
        case 'A': inferred.add('Drama'); inferred.add('Romance'); inferred.add('Slice of Life'); inferred.add('School'); break;
        case 'B': inferred.add('Mystery'); inferred.add('Sci-Fi'); inferred.add('Thriller'); inferred.add('Psychological'); break;
        case 'C': inferred.add('Action'); inferred.add('Adventure'); inferred.add('Martial Arts'); inferred.add('Mecha'); break;
        case 'D': inferred.add('Fantasy'); inferred.add('Sci-Fi'); inferred.add('Space'); inferred.add('Historical'); break;
        case 'E': inferred.add('Slice of Life'); inferred.add('Comedy'); inferred.add('School'); break;
    }
    // Q3
    switch (answers.q3_plot) {
        case 'A': inferred.add('Shounen'); inferred.add('Shoujo'); inferred.add('Sports'); inferred.add('Adventure'); break;
        case 'B': inferred.add('Mystery'); inferred.add('Thriller'); inferred.add('Psychological'); inferred.add('Dementia'); break;
        case 'C': inferred.add('Slice of Life'); /* Iyashikei tag needed? */ break;
        case 'D': inferred.add('Action'); inferred.add('Adventure'); inferred.add('Comedy'); break;
        case 'E': inferred.add('Drama'); inferred.add('Horror'); inferred.add('Psychological'); inferred.add('Seinen'); break;
    }
    // Q4
    switch (answers.q4_setting) {
        case 'A': inferred.add('School'); inferred.add('Slice of Life'); break;
        case 'B': inferred.add('Fantasy'); inferred.add('Magic'); inferred.add('Adventure'); break;
        case 'C': inferred.add('Sci-Fi'); inferred.add('Space'); inferred.add('Mecha'); break;
        case 'D': inferred.add('Historical'); inferred.add('Samurai'); break;
        case 'E': inferred.add('Music'); inferred.add('Sports'); inferred.add('Game'); break;
    }
    // Q5
    switch (answers.q5_partner) {
        case 'A': inferred.add('Comedy'); inferred.add('School'); inferred.add('Romance'); inferred.add('Harem'); break;
        case 'B': inferred.add('Mystery'); inferred.add('Psychological'); inferred.add('Sci-Fi'); inferred.add('Supernatural'); break;
        case 'C': inferred.add('Slice of Life'); inferred.add('Romance'); inferred.add('Shoujo'); break;
        case 'D': inferred.add('Action'); inferred.add('Adventure'); inferred.add('Shounen'); inferred.add('Super Power'); break;
        case 'E': inferred.add('Parody'); inferred.add('Dementia'); inferred.add('Music'); break;
    }
    return Array.from(inferred);
}