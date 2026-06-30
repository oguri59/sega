/**
 * 마비노기 세이크리드 가드 데미지 계산기 - 계산 및 UI 엔진
 */

// 전역 상태 관리
let savedBuild = null;

// DOM 요소 바인딩 및 초기화
document.addEventListener("DOMContentLoaded", () => {
    initDropdowns();
    setupEventListeners();
    initAccordion();
    calculate(); // 초기 연산 수행
});

// 드롭다운 항목 바인딩
function initDropdowns() {
    // 1. 무기 목록 바인딩
    const weaponSelect = document.getElementById("equip-weapon");
    weaponSelect.innerHTML = "";
    Object.keys(WEAPON_DATA).forEach(key => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = WEAPON_DATA[key].name;
        weaponSelect.appendChild(option);
    });

    // 1.5. 방패 목록 바인딩
    const shieldSelect = document.getElementById("equip-shield");
    shieldSelect.innerHTML = "";
    Object.keys(SHIELD_DATA).forEach(key => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = SHIELD_DATA[key].name;
        shieldSelect.appendChild(option);
    });

    // 2. 윈드밀 랭크 바인딩
    const windmillSelect = document.getElementById("skill-windmill-rank");
    windmillSelect.innerHTML = "";
    WINDMILL_RANK_DATA.forEach(item => {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = `${item.rank} (${Math.round(item.value * 100)}%)`;
        if (item.rank === "3단") option.selected = true;
        windmillSelect.appendChild(option);
    });

    // 3. 돌진 랭크 바인딩
    const chargeSelect = document.getElementById("skill-charge-rank");
    chargeSelect.innerHTML = "";
    CHARGE_RANK_DATA.forEach(item => {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = `${item.rank} (${Math.round(item.value * 100)}%)`;
        if (item.rank === "3단") option.selected = true;
        chargeSelect.appendChild(option);
    });

    // 3.5. 스매시 랭크 바인딩
    const smashSelect = document.getElementById("skill-smash-rank");
    smashSelect.innerHTML = "";
    SMASH_RANK_DATA.forEach(item => {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = `${item.rank} (${Math.round(item.value * 100)}%)`;
        if (item.rank === "3단") option.selected = true;
        smashSelect.appendChild(option);
    });

    // 3.6. 배쉬 랭크 바인딩
    const bashSkillSelect = document.getElementById("skill-bash-rank");
    bashSkillSelect.innerHTML = "";
    BASH_RANK_DATA.forEach(item => {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = `${item.rank} (${Math.round(item.value * 100)}%)`;
        if (item.rank === "3단") option.selected = true;
        bashSkillSelect.appendChild(option);
    });
}

// 이벤트 리스너 바인딩
function setupEventListeners() {
    // 모든 수치 입력 요소에 실시간 계산 트리거 추가
    const inputElements = document.querySelectorAll(
        "input[type='number'], select, input[type='checkbox'], input[type='radio']"
    );
    inputElements.forEach(elem => {
        elem.addEventListener("input", calculate);
        elem.addEventListener("change", calculate);
    });

    // 빌드 비교 제어 버튼 리스너
    document.getElementById("btn-save-build").addEventListener("click", saveCurrentBuild);
    document.getElementById("btn-reset-build").addEventListener("click", resetBuildComparison);
}

// 아코디언 토글
function initAccordion() {
    const trigger = document.getElementById("breakdown-toggle");
    const content = document.getElementById("breakdown-content");

    trigger.addEventListener("click", () => {
        const isActive = trigger.classList.toggle("active");
        if (isActive) {
            content.classList.remove("hidden");
        } else {
            content.classList.add("hidden");
        }
    });
}

// 데미지 및 스탯 핵심 연산
function calculate() {
    // 1. 입력 수치 파싱
    const maxDmg = Math.max(0, parseFloat(document.getElementById("stat-max-dmg").value) || 0);
    const baseDef = Math.max(0, parseFloat(document.getElementById("stat-defense").value) || 0);
    const maxHp = Math.max(0, parseFloat(document.getElementById("stat-max-hp").value) || 0);
    const addCrit = parseFloat(document.getElementById("stat-add-crit").value) || 0;
    const bonusDmg = parseFloat(document.getElementById("stat-bonus-dmg").value) || 0;
    const arcanaBonusDmg = parseFloat(document.getElementById("stat-arcana-bonus-dmg").value) || 0;

    // 무기 및 방패 효과
    const weaponKey = document.getElementById("equip-weapon").value;
    const weapon = WEAPON_DATA[weaponKey];
    const shieldKey = document.getElementById("equip-shield").value;
    const shield = SHIELD_DATA[shieldKey];
    
    const setSmash = document.getElementById("equip-set-smash").checked;
    const setWindmillOld = document.getElementById("equip-set-windmill-old").checked;
    const setWindmillNew = document.getElementById("equip-set-windmill-new").checked;

    // 도핑 및 버프
    const ladeca = document.getElementById("buff-ladeca").value;
    const bfo = parseFloat(document.getElementById("buff-bfo").value) || 0;
    
    // 물공포 체크
    const potionActive = document.querySelector("input[name='buff-potion']:checked").value === "1";
    const bashVal = parseFloat(document.getElementById("buff-bash").value) || 0;

    // 베이스 스킬 입력
    const windmillRankVal = parseFloat(document.getElementById("skill-windmill-rank").value) || 0;
    const windmillReforge = parseFloat(document.getElementById("skill-windmill-reforge").value) || 0;
    const windmillErg = parseFloat(document.getElementById("skill-windmill-erg").value) || 0;
    const windmillDarkErg = parseFloat(document.getElementById("skill-windmill-darkerg").value) || 0;

    const chargeRankMult = parseFloat(document.getElementById("skill-charge-rank").value) || 0;
    const chargeReforge = parseFloat(document.getElementById("skill-charge-reforge").value) || 0;
    const chargeErg = parseFloat(document.getElementById("skill-charge-erg").value) || 0;
    const chargeDarkErg = parseFloat(document.getElementById("skill-charge-darkerg").value) || 0;

    const smashRankVal = parseFloat(document.getElementById("skill-smash-rank").value) || 0;
    const smashReforge = parseFloat(document.getElementById("skill-smash-reforge").value) || 0;
    const smashErg = parseFloat(document.getElementById("skill-smash-erg").value) || 0;
    const smashDarkErg = parseFloat(document.getElementById("skill-smash-darkerg").value) || 0;

    const bashSkillRankVal = parseFloat(document.getElementById("skill-bash-rank").value) || 0;
    const bashSkillReforge = parseFloat(document.getElementById("skill-bash-reforge").value) || 0;
    const bashSkillErg = parseFloat(document.getElementById("skill-bash-erg").value) || 0;
    const bashSkillDarkErg = parseFloat(document.getElementById("skill-bash-darkerg").value) || 0;

    // 2. 무기 및 방패 옵션 해석
    const weaponSmashBonus = weapon.twoHandedSmashBonus; // 양손검 20% 보너스
    const weaponSetSmash = weapon.setSmash;
    const weaponSetWindmill = weapon.setWindmill;
    
    document.getElementById("weapon-desc").textContent = 
        `${weapon.description} (양손스매시보너스: ${weaponSmashBonus * 100}%, 무기스매강: ${weaponSetSmash * 100}%, 무기윈강: ${weaponSetWindmill * 100}%)`;

    const shieldDmgText = (weapon.type === "twohanded") ? "적용 불가 (양손검)" : `+${shield.bonusDmg}%`;
    document.getElementById("shield-desc").textContent = 
        `${shield.description} (대미지 감소율: ${shield.drr}%, 보너스 데미지: ${shieldDmgText})`;

    // 3. 라데카 스킬에 따른 계수 보정
    let ladecaMult = 1.0;
    if (ladeca === "might") {
        ladecaMult = 1.15; // 자이언트 마이트 15% 곱연산
    } else if (ladeca === "breath") {
        ladecaMult = 1.05; // 인간 브레스 5% 곱연산
    }
    // 엘프(none)는 곱연산 없음 (1.0)

    // 4. 최종 스탯 연산
    // 최종 보정 맥댐 (물공포 + 전장의 서곡 적용)
    const potionFactor = potionActive ? 1.2 : 1.0;
    const res0 = maxDmg * potionFactor * (1 + (bfo / 100) * potionFactor);

    // 최종 방어력 (기본 방어력 + 최종 맥댐의 10% 자동 합산)
    const bonusDef = res0 * 0.1;
    const finalDef = baseDef + bonusDef;

    // 최종 생명력
    const finalHp = maxHp;

    // 최종 보너스 대미지 합산 (기본보너스대미지 + 아르카나보너스대미지 + 무기보너스대미지 + 방패보너스대미지 [양손검일 경우 제외])
    const shieldBonusDmgApply = (weapon.type === "twohanded") ? 0.0 : shield.bonusDmg;
    const totalBonusDmg = bonusDmg + arcanaBonusDmg + weapon.bonusDmg + shieldBonusDmgApply;

    // UI에 스탯 요약 업데이트
    document.getElementById("summary-final-max-dmg").textContent = Math.floor(res0).toLocaleString();
    document.getElementById("summary-final-defense").textContent = Math.floor(finalDef).toLocaleString();
    document.getElementById("summary-defense-breakdown").textContent = 
        `(기본 ${baseDef.toLocaleString()} + 맥댐 10% 보너스 ${Math.floor(bonusDef).toLocaleString()})`;
    document.getElementById("summary-final-hp").textContent = Math.floor(finalHp).toLocaleString();

    // 5. 기저 베이스 스킬 데미지 연산
    // 윈드밀 데미지 공식 (구형 세트: 합산 +30% / 신형 세트: 곱산 *1.15)
    let baseWindmillMult = windmillRankVal + 0.03 * windmillReforge;
    if (setWindmillOld) {
        baseWindmillMult += 0.30;
    }
    if (setWindmillNew) {
        baseWindmillMult *= 1.15;
    }
    // 에르그 및 어둠의 에르그 합산 보정
    baseWindmillMult += (windmillErg / 100) + (windmillDarkErg / 100);

    // 기저 돌진 데미지 공식 (세공 + 에르그 및 어둠의 에르그 합산 보정)
    const baseChargeMult = chargeRankMult + 0.1 * chargeReforge + (chargeErg / 100) + (chargeDarkErg / 100);

    // 기저 스매시 데미지 공식 (스매시 세공은 레벨당 +10%, 에르그 및 어둠의 에르그 합산 보정)
    const baseSmashMult = smashRankVal + 0.1 * smashReforge + (smashErg / 100) + (smashDarkErg / 100);

    // 기저 배쉬 데미지 공식 (배쉬 세공은 레벨당 +10%, 에르그 및 어둠의 에르그 합산 보정)
    const baseBashMult = bashSkillRankVal + 0.1 * bashSkillReforge + (bashSkillErg / 100) + (bashSkillDarkErg / 100);

    // 실시간 UI 범례 배율 라벨 업데이트
    document.getElementById("windmill-final-mult-label").textContent = `${Math.round(baseWindmillMult * 100)}%`;
    document.getElementById("charge-final-mult-label").textContent = `${Math.round(baseChargeMult * 100)}%`;
    document.getElementById("smash-final-mult-label").textContent = `${Math.round(baseSmashMult * 100)}%`;
    document.getElementById("bash-final-mult-label").textContent = `${Math.round(baseBashMult * 100)}%`;

    // 기저 윈드밀 스킬 데미지 (보너스 대미지 곱연산 이전)
    const rawWindmillDmg = res0 * 
        baseWindmillMult * 
        (1 + weaponSetWindmill) * 
        (1 + bashVal) * 
        ladecaMult;
    
    const windmillDmg = rawWindmillDmg * (1 + totalBonusDmg / 100);

    // 기저 돌진 스킬 데미지 (보너스 대미지 곱연산 이전)
    const rawChargeDmg = res0 * 
        baseChargeMult * 
        (1 + bashVal) * 
        ladecaMult;

    const chargeDmg = rawChargeDmg * (1 + totalBonusDmg / 100);

    // 기저 스매시 스킬 데미지 (보너스 대미지 곱연산 이전)
    const rawSmashDmg = res0 * 
        baseSmashMult * 
        (1 + weaponSmashBonus) * 
        (1 + (setSmash ? 0.15 : 0) + weaponSetSmash) * 
        (1 + bashVal) * 
        ladecaMult;

    const smashDmg = rawSmashDmg * (1 + totalBonusDmg / 100);

    // 기저 배쉬 스킬 데미지 (보너스 대미지 곱연산 이전)
    const rawBashSkillDmg = res0 * 
        baseBashMult * 
        ladecaMult;

    const bashSkillDmg = rawBashSkillDmg * (1 + totalBonusDmg / 100);

    // 6. 세이크리드 가드 5대 스킬 데미지 연산
    // 크리티컬 배율 공통 정의
    const critMult = 2.5 + (addCrit / 100);

    // [1] 성역 전개: (맥댐 300% + 방어 150% + 생명 20%) * 보너스 대미지
    const rawSanctuary = res0 * 3.0 + finalDef * 1.5 + finalHp * 0.2;
    const sanctuaryNormal = rawSanctuary * (1 + totalBonusDmg / 100);
    const sanctuaryCrit = sanctuaryNormal * critMult;

    // [2] 철벽 강타: (윈드밀 150% + 맥댐 1200% + 방어 600% + 생명 100%) * 보너스 대미지
    const rawIronwall = rawWindmillDmg * 1.5 + res0 * 12.0 + finalDef * 6.0 + finalHp * 1.0;
    const ironwallNormal = rawIronwall * (1 + totalBonusDmg / 100);
    const ironwallCrit = ironwallNormal * critMult;

    // [2.5] 단죄의 일격 1단계: (윈드밀 175% + 맥댐 1500% + 방어 900% + 생명 150%) * 보너스 대미지
    const rawCondemnation1 = rawWindmillDmg * 1.75 + res0 * 15.0 + finalDef * 9.0 + finalHp * 1.5;
    const condemnation1Normal = rawCondemnation1 * (1 + totalBonusDmg / 100);
    const condemnation1Crit = condemnation1Normal * critMult;

    // [2.6] 단죄의 일격 2단계: (윈드밀 175% + 맥댐 2250% + 방어 1350% + 생명 225%) * 보너스 대미지
    const rawCondemnation2 = rawWindmillDmg * 1.75 + res0 * 22.5 + finalDef * 13.5 + finalHp * 2.25;
    const condemnation2Normal = rawCondemnation2 * (1 + totalBonusDmg / 100);
    const condemnation2Crit = condemnation2Normal * critMult;

    // [2.7] 단죄의 일격 3단계: (윈드밀 175% + 맥댐 3000% + 방어 1800% + 생명 300%) * 보너스 대미지
    const rawCondemnation3 = rawWindmillDmg * 1.75 + res0 * 30.0 + finalDef * 18.0 + finalHp * 3.0;
    const condemnation3Normal = rawCondemnation3 * (1 + totalBonusDmg / 100);
    const condemnation3Crit = condemnation3Normal * critMult;

    // [3] 심판의 일격: (윈드밀 200% + 맥댐 3500% + 방어 2000% + 생명 500%) * 보너스 대미지
    const rawJudgment = rawWindmillDmg * 2.0 + res0 * 35.0 + finalDef * 20.0 + finalHp * 5.0;
    const judgmentNormal = rawJudgment * (1 + totalBonusDmg / 100);
    const judgmentCrit = judgmentNormal * critMult;

    // [4] 격돌: (돌진 150% + 맥댐 800% + 방어 600% + 생명 50%) * 보너스 대미지
    const rawClash = rawChargeDmg * 1.5 + res0 * 8.0 + finalDef * 6.0 + finalHp * 0.5;
    const clashNormal = rawClash * (1 + totalBonusDmg / 100);
    const clashCrit = clashNormal * critMult;

    // [5] 희생의 응징: (맥댐 60.0 + 방어 40.0 + 생명력 15.0) * (1 + 방패 대미지 감소율 / 100) * 보너스 대미지
    const rawRetribution = (res0 * 60.0 + finalDef * 40.0 + finalHp * 15.0) * (1 + shield.drr / 100);
    const retributionNormal = rawRetribution * (1 + totalBonusDmg / 100);
    const retributionCrit = retributionNormal * critMult;

    // 7. UI 결과값 업데이트
    const results = {
        "sanctuary": { normal: sanctuaryNormal, crit: sanctuaryCrit },
        "ironwall": { normal: ironwallNormal, crit: ironwallCrit },
        "condemnation1": { normal: condemnation1Normal, crit: condemnation1Crit },
        "condemnation2": { normal: condemnation2Normal, crit: condemnation2Crit },
        "condemnation3": { normal: condemnation3Normal, crit: condemnation3Crit },
        "judgment": { normal: judgmentNormal, crit: judgmentCrit },
        "clash": { normal: clashNormal, crit: clashCrit },
        "retribution": { normal: retributionNormal, crit: retributionCrit },
        "windmill": { normal: windmillDmg, crit: windmillDmg * critMult },
        "charge": { normal: chargeDmg, crit: chargeDmg * critMult },
        "smash": { normal: smashDmg, crit: smashDmg * critMult },
        "bash": { normal: bashSkillDmg, crit: bashSkillDmg * critMult }
    };

    Object.keys(results).forEach(key => {
        document.getElementById(`dmg-${key}-normal`).textContent = Math.floor(results[key].normal).toLocaleString();
        document.getElementById(`dmg-${key}-crit`).textContent = Math.floor(results[key].crit).toLocaleString();
    });

    // 8. 데미지 공식 상세 분해 렌더링
    document.getElementById("math-sanctuary").innerHTML = 
        `[(${Math.floor(res0).toLocaleString()} &times; 3.0) + (${Math.floor(finalDef).toLocaleString()} &times; 1.5) + (${Math.floor(finalHp).toLocaleString()} &times; 0.2)] &times; (1 + ${totalBonusDmg / 100}) [보너스대미지]<br>` +
        `= [${Math.floor(res0 * 3.0).toLocaleString()} + ${Math.floor(finalDef * 1.5).toLocaleString()} + ${Math.floor(finalHp * 0.2).toLocaleString()}] &times; ${(1 + totalBonusDmg / 100).toFixed(2)}<br>` +
        `= ${Math.floor(rawSanctuary).toLocaleString()} &times; ${(1 + totalBonusDmg / 100).toFixed(2)} = <strong>${Math.floor(sanctuaryNormal).toLocaleString()}</strong>`;

    document.getElementById("math-ironwall").innerHTML = 
        `[(${Math.floor(rawWindmillDmg).toLocaleString()} &times; 1.5) + (${Math.floor(res0).toLocaleString()} &times; 12.0) + (${Math.floor(finalDef).toLocaleString()} &times; 6.0) + (${Math.floor(finalHp).toLocaleString()} &times; 1.0)] &times; (1 + ${totalBonusDmg / 100}) [보너스대미지]<br>` +
        `= [${Math.floor(rawWindmillDmg * 1.5).toLocaleString()} + ${Math.floor(res0 * 12.0).toLocaleString()} + ${Math.floor(finalDef * 6.0).toLocaleString()} + ${Math.floor(finalHp * 1.0).toLocaleString()}] &times; ${(1 + totalBonusDmg / 100).toFixed(2)}<br>` +
        `= ${Math.floor(rawIronwall).toLocaleString()} &times; ${(1 + totalBonusDmg / 100).toFixed(2)} = <strong>${Math.floor(ironwallNormal).toLocaleString()}</strong>`;

    document.getElementById("math-condemnation1").innerHTML = 
        `[(${Math.floor(rawWindmillDmg).toLocaleString()} &times; 1.75) + (${Math.floor(res0).toLocaleString()} &times; 15.0) + (${Math.floor(finalDef).toLocaleString()} &times; 9.0) + (${Math.floor(finalHp).toLocaleString()} &times; 1.5)] &times; (1 + ${totalBonusDmg / 100}) [보너스대미지]<br>` +
        `= [${Math.floor(rawWindmillDmg * 1.75).toLocaleString()} + ${Math.floor(res0 * 15.0).toLocaleString()} + ${Math.floor(finalDef * 9.0).toLocaleString()} + ${Math.floor(finalHp * 1.5).toLocaleString()}] &times; ${(1 + totalBonusDmg / 100).toFixed(2)}<br>` +
        `= ${Math.floor(rawCondemnation1).toLocaleString()} &times; ${(1 + totalBonusDmg / 100).toFixed(2)} = <strong>${Math.floor(condemnation1Normal).toLocaleString()}</strong>`;

    document.getElementById("math-condemnation2").innerHTML = 
        `[(${Math.floor(rawWindmillDmg).toLocaleString()} &times; 1.75) + (${Math.floor(res0).toLocaleString()} &times; 22.5) + (${Math.floor(finalDef).toLocaleString()} &times; 13.5) + (${Math.floor(finalHp).toLocaleString()} &times; 2.25)] &times; (1 + ${totalBonusDmg / 100}) [보너스대미지]<br>` +
        `= [${Math.floor(rawWindmillDmg * 1.75).toLocaleString()} + ${Math.floor(res0 * 22.5).toLocaleString()} + ${Math.floor(finalDef * 13.5).toLocaleString()} + ${Math.floor(finalHp * 2.25).toLocaleString()}] &times; ${(1 + totalBonusDmg / 100).toFixed(2)}<br>` +
        `= ${Math.floor(rawCondemnation2).toLocaleString()} &times; ${(1 + totalBonusDmg / 100).toFixed(2)} = <strong>${Math.floor(condemnation2Normal).toLocaleString()}</strong>`;

    document.getElementById("math-condemnation3").innerHTML = 
        `[(${Math.floor(rawWindmillDmg).toLocaleString()} &times; 1.75) + (${Math.floor(res0).toLocaleString()} &times; 30.0) + (${Math.floor(finalDef).toLocaleString()} &times; 18.0) + (${Math.floor(finalHp).toLocaleString()} &times; 3.0)] &times; (1 + ${totalBonusDmg / 100}) [보너스대미지]<br>` +
        `= [${Math.floor(rawWindmillDmg * 1.75).toLocaleString()} + ${Math.floor(res0 * 30.0).toLocaleString()} + ${Math.floor(finalDef * 18.0).toLocaleString()} + ${Math.floor(finalHp * 3.0).toLocaleString()}] &times; ${(1 + totalBonusDmg / 100).toFixed(2)}<br>` +
        `= ${Math.floor(rawCondemnation3).toLocaleString()} &times; ${(1 + totalBonusDmg / 100).toFixed(2)} = <strong>${Math.floor(condemnation3Normal).toLocaleString()}</strong>`;

    document.getElementById("math-judgment").innerHTML = 
        `[(${Math.floor(rawWindmillDmg).toLocaleString()} &times; 2.0) + (${Math.floor(res0).toLocaleString()} &times; 35.0) + (${Math.floor(finalDef).toLocaleString()} &times; 20.0) + (${Math.floor(finalHp).toLocaleString()} &times; 5.0)] &times; (1 + ${totalBonusDmg / 100}) [보너스대미지]<br>` +
        `= [${Math.floor(rawWindmillDmg * 2.0).toLocaleString()} + ${Math.floor(res0 * 35.0).toLocaleString()} + ${Math.floor(finalDef * 20.0).toLocaleString()} + ${Math.floor(finalHp * 5.0).toLocaleString()}] &times; ${(1 + totalBonusDmg / 100).toFixed(2)}<br>` +
        `= ${Math.floor(rawJudgment).toLocaleString()} &times; ${(1 + totalBonusDmg / 100).toFixed(2)} = <strong>${Math.floor(judgmentNormal).toLocaleString()}</strong>`;

    document.getElementById("math-clash").innerHTML = 
        `[(${Math.floor(rawChargeDmg).toLocaleString()} &times; 1.5) + (${Math.floor(res0).toLocaleString()} &times; 8.0) + (${Math.floor(finalDef).toLocaleString()} &times; 6.0) + (${Math.floor(finalHp).toLocaleString()} &times; 0.5)] &times; (1 + ${totalBonusDmg / 100}) [보너스대미지]<br>` +
        `= [${Math.floor(rawChargeDmg * 1.5).toLocaleString()} + ${Math.floor(res0 * 8.0).toLocaleString()} + ${Math.floor(finalDef * 6.0).toLocaleString()} + ${Math.floor(finalHp * 0.5).toLocaleString()}] &times; ${(1 + totalBonusDmg / 100).toFixed(2)}<br>` +
        `= ${Math.floor(rawClash).toLocaleString()} &times; ${(1 + totalBonusDmg / 100).toFixed(2)} = <strong>${Math.floor(clashNormal).toLocaleString()}</strong>`;

    const baseRetributionVal = res0 * 60.0 + finalDef * 40.0 + finalHp * 15.0;
    const retributionShieldFactor = 1 + shield.drr / 100;
    document.getElementById("math-retribution").innerHTML = 
        `[(${Math.floor(res0).toLocaleString()} &times; 60.0) + (${Math.floor(finalDef).toLocaleString()} &times; 40.0) + (${Math.floor(finalHp).toLocaleString()} &times; 15.0)] &times; ${retributionShieldFactor.toFixed(2)} [방패감소율] &times; (1 + ${totalBonusDmg / 100}) [보너스대미지]<br>` +
        `= [${Math.floor(res0 * 60.0).toLocaleString()} + ${Math.floor(finalDef * 40.0).toLocaleString()} + ${Math.floor(finalHp * 15.0).toLocaleString()}] &times; ${retributionShieldFactor.toFixed(2)} &times; ${(1 + totalBonusDmg / 100).toFixed(2)}<br>` +
        `= ${Math.floor(baseRetributionVal * retributionShieldFactor).toLocaleString()} &times; ${(1 + totalBonusDmg / 100).toFixed(2)} = <strong>${Math.floor(retributionNormal).toLocaleString()}</strong>`;

    // 스매시 분해
    document.getElementById("math-smash").innerHTML = 
        `[(${Math.floor(res0).toLocaleString()} &times; ${baseSmashMult.toFixed(2)}) &times; ${(1 + weaponSmashBonus).toFixed(2)} [양검보너스] &times; ${(1 + (setSmash ? 0.15 : 0) + weaponSetSmash).toFixed(2)} [스매강] &times; ${(1 + bashVal).toFixed(2)} [배쉬] &times; ${ladecaMult.toFixed(2)} [라데카]] &times; (1 + ${totalBonusDmg / 100}) [보너스대미지]<br>` +
        `= ${Math.floor(rawSmashDmg).toLocaleString()} &times; ${(1 + totalBonusDmg / 100).toFixed(2)} = <strong>${Math.floor(smashDmg).toLocaleString()}</strong>`;

    // 배쉬 분해
    document.getElementById("math-bash").innerHTML = 
        `[(${Math.floor(res0).toLocaleString()} &times; ${baseBashMult.toFixed(2)}) &times; ${ladecaMult.toFixed(2)} [라데카]] &times; (1 + ${totalBonusDmg / 100}) [보너스대미지]<br>` +
        `= ${Math.floor(rawBashSkillDmg).toLocaleString()} &times; ${(1 + totalBonusDmg / 100).toFixed(2)} = <strong>${Math.floor(bashSkillDmg).toLocaleString()}</strong>`;

    // 9. 빌드 비교 렌더링 수행
    updateComparisonUI(results);
}

// 현재 빌드 데이터를 전역 변수에 저장
function saveCurrentBuild() {
    const maxDmg = Math.floor(parseFloat(document.getElementById("summary-final-max-dmg").textContent.replace(/,/g, '')) || 0);
    const finalDef = Math.floor(parseFloat(document.getElementById("summary-final-defense").textContent.replace(/,/g, '')) || 0);
    const finalHp = Math.floor(parseFloat(document.getElementById("summary-final-hp").textContent.replace(/,/g, '')) || 0);

    const getVal = (id) => Math.floor(parseFloat(document.getElementById(id).textContent.replace(/,/g, '')) || 0);

    savedBuild = {
        meta: { maxDmg, finalDef, finalHp, timestamp: new Date().toLocaleTimeString() },
        skills: {
            "sanctuary": getVal("dmg-sanctuary-normal"),
            "ironwall": getVal("dmg-ironwall-normal"),
            "condemnation1": getVal("dmg-condemnation1-normal"),
            "condemnation2": getVal("dmg-condemnation2-normal"),
            "condemnation3": getVal("dmg-condemnation3-normal"),
            "judgment": getVal("dmg-judgment-normal"),
            "clash": getVal("dmg-clash-normal"),
            "retribution": getVal("dmg-retribution-normal"),
            "windmill": getVal("dmg-windmill-normal"),
            "charge": getVal("dmg-charge-normal"),
            "smash": getVal("dmg-smash-normal"),
            "bash": getVal("dmg-bash-normal")
        }
    };

    document.getElementById("btn-reset-build").classList.remove("hidden");
    document.getElementById("comparison-status-text").textContent = `비교 빌드 저장 완료! (${savedBuild.meta.timestamp})`;
    document.getElementById("comparison-sub-text").textContent = `기준 스탯 - 맥댐: ${savedBuild.meta.maxDmg}, 방어: ${savedBuild.meta.finalDef}, 생명: ${savedBuild.meta.finalHp}`;

    calculate(); // 비교 배지를 띄우기 위해 다시 연산 트리거
}

// 빌드 비교 비활성화
function resetBuildComparison() {
    savedBuild = null;
    document.getElementById("btn-reset-build").classList.add("hidden");
    document.getElementById("comparison-status-text").textContent = "저장된 빌드가 없습니다. 현재 셋팅을 저장하여 비교해보세요!";
    document.getElementById("comparison-sub-text").textContent = "";

    // 비교 배지 전부 숨김
    const badges = document.querySelectorAll(".compare-badge");
    badges.forEach(badge => {
        badge.classList.add("hidden");
    });
}

// 현재 계산값과 저장된 빌드 값을 대조하여 증감율 렌더링
function updateComparisonUI(currentResults) {
    if (!savedBuild) return;

    Object.keys(currentResults).forEach(key => {
        const badge = document.getElementById(`compare-${key}`);
        if (!badge) return;

        const currentVal = currentResults[key].normal;
        const savedVal = savedBuild.skills[key];

        if (savedVal === 0) {
            badge.classList.add("hidden");
            return;
        }

        const pct = ((currentVal - savedVal) / savedVal) * 100;
        
        badge.classList.remove("hidden", "positive", "negative");
        
        const sign = pct >= 0 ? "+" : "";
        badge.querySelector(".compare-val").textContent = `${sign}${pct.toFixed(1)}%`;

        if (pct > 0.05) {
            badge.classList.add("positive");
        } else if (pct < -0.05) {
            badge.classList.add("negative");
        }
    });
}
