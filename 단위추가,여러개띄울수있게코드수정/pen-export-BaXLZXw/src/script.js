let popupCount = 0; // 팝업의 개수를 추적하는 변수

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
        "x-nxopen-api-key": "test_657cd016cf4351aaf5ce2014ff9cf2092535ce246f0ffc3d72cf2d4577e69380efe8d04e6d233bd35cf2fabdeb93fb0d" // 발급받은 nxopen_api_key 입력
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

        // 두 번째 요청: 캐릭터 기본 정보, 전투력, 인기도, 유니온 정보 가져오기
        return Promise.all([
            fetch(`https://open.api.nexon.com/maplestory/v1/character/basic?ocid=${ocid}`, {
                method: "GET",
                headers: headers
            }).then(res => {
                if (!res.ok) {
                    throw new Error('캐릭터 기본 정보를 불러오는 중 오류가 발생했습니다.');
                }
                return res.json();
            }),
            fetch(`https://open.api.nexon.com/maplestory/v1/character/stat?ocid=${ocid}&date=${searchDate}`, {
                method: "GET",
                headers: headers
            }).then(res => {
                if (!res.ok) {
                    throw new Error('캐릭터 전투력을 불러오는 중 오류가 발생했습니다.');
                }
                return res.json();
            }),
            fetch(`https://open.api.nexon.com/maplestory/v1/character/popularity?ocid=${ocid}&date=${searchDate}`, {
                method: "GET",
                headers: headers
            }).then(res => {
                if (!res.ok) {
                    throw new Error('인기도 정보를 불러오는 중 오류가 발생했습니다.');
                }
                return res.json();
            }),
            fetch(`https://open.api.nexon.com/maplestory/v1/user/union?ocid=${ocid}&date=${searchDate}`, {
                method: "GET",
                headers: headers
            }).then(res => {
                if (!res.ok) {
                    throw new Error('유니온 정보를 불러오는 중 오류가 발생했습니다.');
                }
                return res.json();
            })
        ]);
    })
    .then(([basicData, combatData, popularityData, unionData]) => {
        // 전투력 포맷 수정 (억 단위로 구분)
        const combatPower = combatData.final_stat.find(stat => stat.stat_name === "전투력")?.stat_value || '정보 없음';
        const formattedCombatPower = formatCombatPower(combatPower);

        // 경험치 비율에 % 추가
        const expRate = basicData.character_exp_rate ? `${basicData.character_exp_rate}%` : '정보 없음';

        // 새로운 팝업 생성
        popupCount++; // 팝업 번호 증가
        const newPopup = document.createElement('div');
        newPopup.id = `character-info-${popupCount}`;
        newPopup.classList.add('character-info-popup');
        
        // 기본 정보 HTML에 반영
        newPopup.innerHTML = `
            <button onclick="closeCharacterInfo(${popupCount})">X</button>
            <h2>캐릭터 정보</h2>
            <div class="character-content">
                <div class="character-detail">
                    <p>월드: <span id="world_name">${basicData.world_name || '정보 없음'}</span></p>
                    <p>직업: <span id="character_class">${basicData.character_class || '정보 없음'}</span></p>
                    <p>이름: <span id="character_name">${basicData.character_name || '정보 없음'}</span></p>
                    <p>캐릭터 레벨: <span id="character_level">${basicData.character_level || '정보 없음'}</span></p>
                    <p>경험치 비율: <span id="character_exp_rate">${expRate}</span></p>
                    <p>길드 이름: <span id="character_guild_name">${basicData.character_guild_name || '정보 없음'}</span></p>
                    <p>인기도: <span id="popularity">${popularityData.popularity || '정보 없음'}</span></p>
                    <p>전투력: <span id="combat_power">${formattedCombatPower}</span></p>
                    <p>유니온: <span id="union_level">${unionData.union_level || '정보 없음'}</span></p>
                </div>
                <div class="image-container">
                    <img src="${basicData.character_image || ''}" alt="캐릭터 이미지" id="character_image">
                </div>
            </div>
        `;
        
        // 새 팝업을 body에 추가
        document.body.appendChild(newPopup);

        // 팝업 드래그 기능 추가
        enableDrag(newPopup);
    })
    .catch(error => {
        alert(error.message); // 사용자에게 오류 메시지 표시
        console.error('Error:', error);
    });
}

function closeCharacterInfo(popupId) {
    const popup = document.getElementById(`character-info-${popupId}`);
    if (popup) {
        popup.remove(); // 팝업 제거
    }
}

// 전투력 포맷팅 함수 (0억 0000만 0000 형태로 구분)
function formatCombatPower(combatPower) {
    if (combatPower === '정보 없음') return combatPower;

    const value = parseInt(combatPower, 10);
    if (isNaN(value)) return combatPower; // 전투력 값이 숫자가 아닐 경우

    const billions = Math.floor(value / 100000000); // 억 단위
    const millions = Math.floor((value % 100000000) / 10000); // 만 단위
    const thousands = value % 10000; // 천 단위

    return `${billions}억 ${millions.toString().padStart(4, '0')}만 ${thousands.toString().padStart(4, '0')}`;
}

function enableDrag(popupElement) {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    // 팝업을 클릭할 때 드래그 시작
    popupElement.addEventListener('mousedown', (e) => {
        isDragging = true;

        // 팝업의 현재 위치와 마우스 클릭 위치 계산
        const rect = popupElement.getBoundingClientRect();
        offsetX = e.clientX - rect.left;  // 클릭 위치와 팝업 왼쪽 경계의 차이
        offsetY = e.clientY - rect.top;   // 클릭 위치와 팝업 상단 경계의 차이

        // 마우스 커서 스타일 변경
        popupElement.style.cursor = 'move';

        // 팝업을 다른 요소 위로 올리기 위해 z-index 설정
        popupElement.style.zIndex = 1000;
    });

    // 마우스를 움직일 때 팝업 이동
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            // 새로운 위치 계산
            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;

            // 새로운 위치로 팝업 이동
            popupElement.style.left = `${newX}px`;
            popupElement.style.top = `${newY}px`;
            popupElement.style.position = 'absolute'; // 절대 위치 지정
        }
    });

    // 드래그 종료
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            popupElement.style.cursor = 'default';

            // 드래그가 끝나면 z-index 초기화
            popupElement.style.zIndex = '';

            // 팝업이 마우스를 떴을 때 이동을 멈추도록 position 고정
            popupElement.style.position = 'absolute';
        }
    });
}
