let popupCount = 0; // 팝업의 개수를 추적하는 변수
let positionCount = 0; // 팝업의 Y축 위치를 누적, 계산하기 위한 변수
let leftPosition = 20;// 초기 좌측 여백을 20px로 설정

window.onload = function() { 
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1); // 하루 전 날짜 설정

    // 날짜를 'YYYY-MM-DD' 형식으로 변환
    const formattedDate = yesterday.toISOString().slice(0, 10);
    document.getElementById('search-date').value = formattedDate;
    document.getElementById('character-name').value = ''; // 캐릭터 이름 초기화

    // Enter 키를 눌렀을 때도 검색 기능을 실행하도록 이벤트 리스너 추가
    document.getElementById('character-name').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            searchCharacter(); // 엔터키를 눌렀을 때 searchCharacter 호출
        }
    });
};

function searchCharacter() {
    const characterName = document.getElementById('character-name').value; // 사용자가 입력한 캐릭터 이름 가져오기
    const searchDate = document.getElementById('search-date').value;

    if (!characterName) {
        alert("캐릭터 닉네임을 입력하세요."); // 입력 검증
        return;
    }

    const headers = {
        "x-nxopen-api-key": "test_2e7bbb76a9327c457410f73e4abeb16afecf44c0a58d40c4c125208b723c2e19efe8d04e6d233bd35cf2fabdeb93fb0d" // 발급받은 nxopen_api_key 입력
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
            fetch(`https://open.api.nexon.com/maplestory/v1/character/basic?ocid=${ocid}&date=${searchDate}`, {
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
            <close-button onclick="closeCharacterInfo(${popupCount})">X</close-button>
            <h2>캐릭터 정보</h2>
            <div class="character-content">
                <div class="character-detail">
                    <p>월드: <span id="world_name">${basicData.world_name || '정보 없음'}</span></p>
                    <p>직업: <span id="character_class">${basicData.character_class || '정보 없음'}</span></p>
                    <p>이름: <span id="character_name">${basicData.character_name || '정보 없음'}</span></p>
                    <p>레벨: <span id="character_level">${basicData.character_level || '정보 없음'}</span></p>
                    <p>경험치: <span id="character_exp_rate">${expRate}</span></p>
                    <p>길드: <span id="character_guild_name">${basicData.character_guild_name || '정보 없음'}</span></p>
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

        // 팝업 위치 조정
        adjustPopupPosition(newPopup);

        // 팝업 드래그 기능 추가
        enableDrag(newPopup);
        enableResize(newPopup);
        adjustPopupSize(newPopup);
    })
    .catch(error => {
        alert(error.message); // 사용자에게 오류 메시지 표시
        console.error('Error:', error);
    });
}

function enableResize(popupElement) {
    // 크기 조절 핸들 생성
    const resizeHandle = document.createElement('div');
    resizeHandle.style.width = '30px';
    resizeHandle.style.height = '20px';
    resizeHandle.style.background = 'gray';
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.bottom = '0';
    resizeHandle.style.right = '0';
    resizeHandle.style.cursor = 'nwse-resize';
    popupElement.appendChild(resizeHandle);

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(document.defaultView.getComputedStyle(popupElement).width, 10);
        startHeight = parseInt(document.defaultView.getComputedStyle(popupElement).height, 10);

        e.preventDefault(); // 기본 이벤트 방지
        e.stopPropagation(); // 다른 이벤트와 충돌 방지
    });

    document.addEventListener('mousemove', (e) => {
        if (isResizing) {
            const newWidth = startWidth + (e.clientX - startX);
            const newHeight = startHeight + (e.clientY - startY);

            if (newWidth > 150) { // 최소 너비 제한
                popupElement.style.width = `${newWidth}px`;
            }
            if (newHeight > 150) { // 최소 높이 제한
                popupElement.style.height = `${newHeight}px`;
            }
        }
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
    });
}
function closeCharacterInfo(popupId) {
    const popup = document.getElementById(`character-info-${popupId}`);
    if (popup) {
        popup.remove(); // 팝업 제거
    }
}

// 전투력 포맷팅 함수 (0억 0000만 0000 형태로 구분)
// 팝업창 크기 조절에 따른 이미지와 정보의 크기 비율을 동적으로 조정
function adjustPopupSize() {
    const popup = document.getElementById("character-info");
    const imageContainer = document.querySelector(".image-container");
    const characterDetail = document.querySelector(".character-detail");
    const characterImage = document.getElementById("character_image");

    // 팝업의 너비와 높이를 가져옴
    const popupWidth = popup.offsetWidth;
    const popupHeight = popup.offsetHeight;

    // 비율을 계산하여 이미지와 캐릭터 정보 크기 조정
    const imageWidth = popupWidth * 0.4; // 이미지 크기를 팝업 너비의 40%로 설정
    const detailWidth = popupWidth * 0.55; // 정보 영역을 팝업 너비의 55%로 설정

    // 이미지 크기 변경
    imageContainer.style.width = `${imageWidth}px`;
    characterImage.style.width = "100%"; // 이미지 크기를 100%로 맞추기

    // 정보 크기 변경
    characterDetail.style.flex = `${detailWidth / popupWidth}`;
}

// 팝업창의 크기가 변경될 때마다 조정
window.addEventListener("resize", adjustPopupSize);

// 페이지 로드 시 처음 크기 조정
window.addEventListener("load", adjustPopupSize);

function formatCombatPower(combatPower) {
    if (combatPower === '정보 없음') return combatPower;  // "정보 없음"일 경우 그대로 반환

    let value = parseInt(combatPower, 10);  // 문자열을 숫자형으로 변환

    if (isNaN(value)) return combatPower;  // 숫자가 아닌 값 처리

    const billions = Math.floor(value / 100000000); // 억 단위
    const millions = Math.floor((value % 100000000) / 10000); // 만 단위
    const thousands = value % 10000; // 천 단위 이하 값

    let result = '';

    if (billions > 0) {
        result += `${billions}억`;  // 억 단위 출력
    }
    if (millions > 0) {
        result += ` ${millions}만`;  // 만 단위 출력
    }
    if (thousands > 0 || result === '') {  // 천 단위 이하 출력 (0일 때 억, 만이 없으면 표시)
        result += ` ${thousands}`;  
    }

    return result.trim();  // 불필요한 공백 제거
}




function adjustPopupPosition(popupElement) {
    const footer = document.querySelector('footer');
    const footerRect = footer.getBoundingClientRect();
    
    let topPosition = 20 + 80 * positionCount; // Y축은 positionCount에 따라 증가
    let currentLeftPosition = leftPosition + 80 * positionCount; // X축도 positionCount에 따라 증가

    
    if (topPosition + popupElement.offsetHeight > footerRect.top + 400) {
      positionCount = 0; // positionCount 초기화
      leftPosition += 420; // x축 이동
      topPosition = 20; // y축 초기화
      currentLeftPosition = leftPosition;
    }

    popupElement.style.position = 'fixed';
    popupElement.style.top = `${topPosition}px`;
    popupElement.style.left = `${currentLeftPosition}px`; // 좌측 20px 여백
  
    positionCount ++;

}

let highestZIndex = 100; // 현재 가장 높은 z-index 값을 추적

function enableDrag(popupElement) {
    let isDragging = true;
    let offsetX, offsetY;

    // 클릭 시 해당 모달을 앞으로 가져오기
    popupElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - popupElement.offsetLeft;
        offsetY = e.clientY - popupElement.offsetTop;

        // 현재 클릭된 모달의 z-index를 가장 앞으로 설정
        highestZIndex++;
        popupElement.style.zIndex = highestZIndex;

        popupElement.style.cursor = 'move'; // 마우스 커서 변경
    });

    // 마우스 이동 시 드래그
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;

            // 팝업 이동
            popupElement.style.left = `${newX}px`;
            popupElement.style.top = `${newY}px`;
        }
    });

    // 마우스를 놓을 때 드래그 종료
    document.addEventListener('mouseup', () => {
        isDragging = false;
        popupElement.style.cursor = 'default'; // 마우스 커서 스타일 원래대로
    });
}