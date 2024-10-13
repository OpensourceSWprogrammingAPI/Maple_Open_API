window.onload = function() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1); // 하루 전 날짜 설정

    // 날짜를 'YYYY-MM-DD' 형식으로 변환
    const formattedDate = yesterday.toISOString().slice(0, 10);
    document.getElementById('search-date').value = formattedDate;
    document.getElementById('character-name').value = ''; // 캐릭터 이름 초기화
};



function searchCharacter() {
    const characterName = document.getElementById('character-name').value; // 사용자가 입력한 캐릭터 이름 가져오기
    const searchDate = document.getElementById('search-date').value;

    if (!characterName) {
        alert("캐릭터 이름을 입력해 주세요."); // 입력 검증
        return;
    }

    const headers = {
        "x-nxopen-api-key": "키 입력"
    }; // 발급받은 nxopen_api_key 입력

    // 첫 번째 요청: 캐릭터 ocid 가져오기
    fetch(`https://open.api.nexon.com/maplestory/v1/id?character_name=${characterName}`, {
        method: "GET",
        headers: headers
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('캐릭터 ID를 불러오는 중 오류가 발생했습니다.');
        }
        return response.json();
    })
    .then(data => {
        const ocid = data.ocid;

        // 두 번째 요청: 캐릭터 정보 가져오기
        return Promise.all([
            fetch(`https://open.api.nexon.com/maplestory/v1/character/basic?ocid=${ocid}&date=${searchDate}`, {
                method: "GET",
                headers: headers
            }),
            fetch(`https://open.api.nexon.com/maplestory/v1/character/stat?ocid=${ocid}&date=${searchDate}`, {
                method: "GET",
                headers: headers
            }),
            fetch(`https://open.api.nexon.com/maplestory/v1/character/popularity?ocid=${ocid}&date=${searchDate}`, {
                method: "GET",
                headers: headers
            })
        ]);
    })
    .then(responses => {
        // 응답을 JSON으로 변환
        return Promise.all(responses.map(response => {
            if (!response.ok) {
                throw new Error('캐릭터 정보를 불러오는 중 오류가 발생했습니다.');
            }
            return response.json();
        }));
    })
    .then(([basicData, characterData, popularityData]) => {
        // 캐릭터 기본 정보 출력
        document.getElementById('character_name').textContent = basicData.character_name;
        document.getElementById('world_name').textContent = basicData.world_name;
        document.getElementById('character_gender').textContent = basicData.character_gender;
        document.getElementById('character_class').textContent = basicData.character_class;
        document.getElementById('character_class_level').textContent = basicData.character_class_level;
        document.getElementById('character_level').textContent = basicData.character_level;
        document.getElementById('character_exp').textContent = basicData.character_exp;
        document.getElementById('character_exp_rate').textContent = basicData.character_exp_rate;
        document.getElementById('character_guild_name').textContent = basicData.character_guild_name;
        document.getElementById('character_date_create').textContent = basicData.character_date_create;
        document.getElementById('access_flag').textContent = basicData.access_flag;
        document.getElementById('liberation_quest_clear_flag').textContent = basicData.liberation_quest_clear_flag;
        document.getElementById('character_image').src = basicData.character_image;
        
       
        const combatPowerData = characterData.final_stat.find(stat => stat.stat_name === "전투력");
        
        // 전투력 HTML에 반영
        if (popularityData) {
            document.getElementById('combat-power').textContent = combatPowerData.stat_value;
        } else {
            document.getElementById('combat-power').textContent = '전투력를 찾을 수 없습니다.';
        }
        //인기도 정보 찾기
        document.getElementById('popularity').textContent = popularityData.popularity;

        document.getElementById('character-info').style.display = 'block';
    })
    .catch(error => {
        alert(error.message); // 사용자에게 오류 메시지 표시
        console.error('Error:', error);
    });
}
