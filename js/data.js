/**
 * 마비노기 세이크리드 가드 데미지 계산기 - 정적 데이터 정의
 * 
 * 사용자 편의를 위해 무기 옵션 및 스킬 랭크 계수를 분리하여 관리합니다.
 * 이 파일의 값을 수정하여 계산기의 기본 적용 계수를 변경할 수 있습니다.
 */

// 무기 목록 및 특수 옵션 정의
const WEAPON_DATA = {
    "axe_soul_liberate": {
        "name": "소울리버레이트 액스 (도끼 1)",
        "type": "axe",
        "twoHandedSmashBonus": 0.0,
        "setSmash": 0.0,
        "setWindmill": 0.0,
        "bonusDmg": 56.0, // 보너스 대미지 +56.0% (곱연산)
        "description": "한손 도끼 계열 무기입니다."
    },
    "axe_nightbringer_viking": {
        "name": "나이트브링어 바이킹 (도끼 2)",
        "type": "axe",
        "twoHandedSmashBonus": 0.0,
        "setSmash": 0.0,
        "setWindmill": 0.0,
        "bonusDmg": 42.0, // 보너스 대미지 +42.0% (곱연산)
        "description": "세이크리드 가드 종결급 한손 도끼 무기입니다."
    },
    "sword_soluna": {
        "name": "태양과 달의 검 (양검 1)",
        "type": "twohanded",
        "twoHandedSmashBonus": 0.20,
        "setSmash": 0.25,
        "setWindmill": 0.15,
        "bonusDmg": 120.0, // 보너스 대미지 +120.0% (곱연산)
        "description": "마비노기 최고 존엄 양손검 무기입니다."
    },
    "sword_soul_liberate": {
        "name": "소울리버레이트 블레이드 (양검 2)",
        "type": "twohanded",
        "twoHandedSmashBonus": 0.20,
        "setSmash": 0.0,
        "setWindmill": 0.0,
        "bonusDmg": 112.0, // 보너스 대미지 +112.0% (곱연산)
        "description": "양손검 계열 무기입니다."
    },
    "sword_nightbringer_warlord": {
        "name": "나이트브링어 워로드 (양검 3)",
        "type": "twohanded",
        "twoHandedSmashBonus": 0.20,
        "setSmash": 0.15,
        "setWindmill": 0.15,
        "bonusDmg": 84.0, // 보너스 대미지 +84.0% (곱연산)
        "description": "엘리트 양손검 무기입니다."
    },
    "custom_onehanded": {
        "name": "기타 일반 한손 무기",
        "type": "onehanded",
        "twoHandedSmashBonus": 0.0,
        "setSmash": 0.0,
        "setWindmill": 0.0,
        "bonusDmg": 0.0,
        "description": "수치가 적용되지 않는 기본 한손 무기입니다."
    },
    "custom_twohanded": {
        "name": "기타 일반 양손 무기",
        "type": "twohanded",
        "twoHandedSmashBonus": 0.20,
        "setSmash": 0.0,
        "setWindmill": 0.0,
        "bonusDmg": 0.0,
        "description": "양손검 스매시 20% 보너스만 적용되는 양손 무기입니다."
    }
};

// 방패 목록 및 특수 옵션 정의 (데미지 감소율 %, 보너스 데미지 %)
const SHIELD_DATA = {
    "shield_vanguard": {
        "name": "뱅가드 (나이트브링어 뱅가드)",
        "drr": 35.0, // 방패 데미지 감소율 35%
        "bonusDmg": 42.0, // 보너스 데미지 +42.0% (곱연산)
        "description": "나이트브링어 뱅가드 방패입니다."
    },
    "shield_soul_liberate": {
        "name": "소울리버레이트 실드",
        "drr": 40.0, // 방패 데미지 감소율 40%
        "bonusDmg": 56.0, // 보너스 데미지 +56.0% (곱연산)
        "description": "소울리버레이트 대형 방패입니다."
    },
    "shield_none": {
        "name": "기타 일반 방패 (미적용)",
        "drr": 0.0,
        "bonusDmg": 0.0,
        "description": "수치가 적용되지 않는 기본 방패입니다."
    }
};

// 윈드밀 랭크별 계수 정의
const WINDMILL_RANK_DATA = [
    { "rank": "3단", "value": 5.0 },
    { "rank": "2단", "value": 4.6 },
    { "rank": "1단", "value": 4.3 },
    { "rank": "1", "value": 4.0 },
    { "rank": "2", "value": 3.8 },
    { "rank": "3", "value": 3.6 },
    { "rank": "4", "value": 3.4 },
    { "rank": "5", "value": 3.2 },
    { "rank": "6", "value": 3.0 },
    { "rank": "7", "value": 2.8 },
    { "rank": "8", "value": 2.6 },
    { "rank": "9", "value": 2.4 },
    { "rank": "A", "value": 2.2 },
    { "rank": "B", "value": 2.1 },
    { "rank": "C", "value": 2.0 },
    { "rank": "D", "value": 1.9 },
    { "rank": "E", "value": 1.8 },
    { "rank": "F", "value": 1.7 },
    { "rank": "연습", "value": 1.5 }
];

// 돌진 랭크별 계수 정의 (모든 종족 공통 계수 적용)
const CHARGE_RANK_DATA = [
    { "rank": "3단", "value": 3.0 },
    { "rank": "2단", "value": 2.8 },
    { "rank": "1단", "value": 2.6 },
    { "rank": "1", "value": 2.4 },
    { "rank": "2", "value": 2.2 },
    { "rank": "3", "value": 2.0 },
    { "rank": "4", "value": 1.8 },
    { "rank": "5", "value": 1.6 },
    { "rank": "6", "value": 1.4 },
    { "rank": "7", "value": 1.3 },
    { "rank": "8", "value": 1.2 },
    { "rank": "9", "value": 1.1 },
    { "rank": "A", "value": 1.0 },
    { "rank": "B", "value": 0.95 },
    { "rank": "C", "value": 0.9 },
    { "rank": "D", "value": 0.85 },
    { "rank": "E", "value": 0.8 },
    { "rank": "F", "value": 0.75 },
    { "rank": "연습", "value": 0.5 }
];

// 스매시 랭크별 계수 정의
const SMASH_RANK_DATA = [
    { "rank": "3단", "value": 6.2 },
    { "rank": "2단", "value": 5.8 },
    { "rank": "1단", "value": 5.4 },
    { "rank": "1", "value": 5.0 },
    { "rank": "2", "value": 4.6 },
    { "rank": "3", "value": 4.2 },
    { "rank": "4", "value": 3.8 },
    { "rank": "5", "value": 3.4 },
    { "rank": "6", "value": 3.0 },
    { "rank": "7", "value": 2.8 },
    { "rank": "8", "value": 2.6 },
    { "rank": "9", "value": 2.4 },
    { "rank": "A", "value": 2.2 },
    { "rank": "B", "value": 2.1 },
    { "rank": "C", "value": 2.0 },
    { "rank": "D", "value": 1.9 },
    { "rank": "E", "value": 1.8 },
    { "rank": "F", "value": 1.7 },
    { "rank": "연습", "value": 1.5 }
];

// 배쉬 랭크별 계수 정의
const BASH_RANK_DATA = [
    { "rank": "3단", "value": 5.0 },
    { "rank": "2단", "value": 4.6 },
    { "rank": "1단", "value": 4.2 },
    { "rank": "1", "value": 3.8 },
    { "rank": "2", "value": 3.5 },
    { "rank": "3", "value": 3.2 },
    { "rank": "4", "value": 2.9 },
    { "rank": "5", "value": 2.6 },
    { "rank": "6", "value": 2.3 },
    { "rank": "7", "value": 2.1 },
    { "rank": "8", "value": 1.9 },
    { "rank": "9", "value": 1.7 },
    { "rank": "A", "value": 1.5 },
    { "rank": "B", "value": 1.4 },
    { "rank": "C", "value": 1.3 },
    { "rank": "D", "value": 1.2 },
    { "rank": "E", "value": 1.1 },
    { "rank": "F", "value": 1.0 },
    { "rank": "연습", "value": 0.8 }
];
