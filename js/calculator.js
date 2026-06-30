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

    // 1.6. 대상 몬스터 목록 바인딩
    const targetSelect = document.getElementById("target-monster");
    targetSelect.innerHTML = "";
    Object.keys(TARGET_DATA).forEach(key => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = TARGET_DATA[key].name;
        targetSelect.appendChild(option);
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
    const charPiercing = Math.max(0, parseInt(document.getElementById("stat-piercing").value) || 0);

    // 적 정보 설정 파싱 (TARGET_DATA 연동)
    const targetKey = document.getElementById("target-monster").value;
    const target = TARGET_DATA[targetKey];
    document.getElementById("target-desc").textContent = target.description;

    const targetProt = target.prot;
    const targetDef = target.def;
    const targetPiercingRes = target.piercingRes;

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

    // 피어싱 및 방어/보호 감소 연산
    const getProtReduction = (level) => level * 5;
    const getDefReduction = (level) => {
        const defTable = [0, 6, 12, 20, 30, 40, 50, 60, 70, 80];
        if (level <= 9) return defTable[level];
        return 80 + (level - 9) * 10;
    };

    // 실적용 피어싱 레벨 계산 (캐릭터 피어싱 - 적 저항)
    const netPiercing = Math.max(0, charPiercing - targetPiercingRes);

    // 1) 일반/표준 피어싱 (최대 9레벨 제한)
    const normalPiercingLevel = Math.min(9, netPiercing);
    const reducedProtNormal = Math.max(0, targetProt - getProtReduction(normalPiercingLevel));
    const reducedDefNormal = Math.max(0, targetDef - getDefReduction(normalPiercingLevel));

    // 보호에 따른 댐감율 공식: Y = 100/sqrt(2) * log10((x + 10*sqrt(2))/(10*sqrt(2))) / 100
    const sqrt2 = Math.sqrt(2);
    const getDmgRedFromProt = (prot) => {
        if (prot <= 0) return 0;
        let red = (100 / sqrt2) * Math.log10((prot + 10 * sqrt2) / (10 * sqrt2)) / 100;
        return Math.min(0.90, Math.max(0.0, red));
    };

    const normalProtMult = 1 - getDmgRedFromProt(reducedProtNormal);

    // 2) 아르카나 스킬 내 일반재능계수 적용 피어싱 (이중 피어싱적용, 최대 18레벨 제한)
    const doublePiercingLevel = Math.min(18, 2 * netPiercing);
    const reducedProtDouble = Math.max(0, targetProt - getProtReduction(doublePiercingLevel));
    const reducedDefDouble = Math.max(0, targetDef - getDefReduction(doublePiercingLevel));
    
    const doubleProtMult = 1 - getDmgRedFromProt(reducedProtDouble);

    // 보너스 대미지 배율 상세 정의 (DC인사이드 분석글 기반 카테고리 분리 곱연산)
    const equipBonusDmgMult = 1 + (weapon.bonusDmg + shieldBonusDmgApply) / 100; // 장비보댐효과
    const normalBonusDmgMult = 1 + bonusDmg / 100; // 일반보댐효과
    const arcanaBonusDmgMult = 1 + arcanaBonusDmg / 100; // 아르카나보댐효과

    // 일반 재능 스킬용 보너스 대미지 최종 배율
    const talentBonusDmgMult = equipBonusDmgMult * normalBonusDmgMult;

    // 기저 윈드밀 스킬 데미지 (보너스 대미지 곱연산 이전)
    const rawWindmillDmg = res0 * 
        baseWindmillMult * 
        (1 + weaponSetWindmill) * 
        (1 + bashVal) * 
        ladecaMult;
    
    const windmillDmg = Math.max(0, rawWindmillDmg * talentBonusDmgMult * normalProtMult - reducedDefNormal);

    // 기저 돌진 스킬 데미지 (보너스 대미지 곱연산 이전)
    const rawChargeDmg = res0 * 
        baseChargeMult * 
        (1 + bashVal) * 
        ladecaMult;

    const chargeDmg = Math.max(0, rawChargeDmg * talentBonusDmgMult * normalProtMult - reducedDefNormal);

    // 기저 스매시 스킬 데미지 (보너스 대미지 곱연산 이전)
    const rawSmashDmg = res0 * 
        baseSmashMult * 
        (1 + weaponSmashBonus) * 
        (1 + (setSmash ? 0.15 : 0) + weaponSetSmash) * 
        (1 + bashVal) * 
        ladecaMult;

    const smashDmg = Math.max(0, rawSmashDmg * talentBonusDmgMult * normalProtMult - reducedDefNormal);

    // 기저 배쉬 스킬 데미지 (보너스 대미지 곱연산 이전)
    const rawBashSkillDmg = res0 * 
        baseBashMult * 
        ladecaMult;

    const bashSkillDmg = Math.max(0, rawBashSkillDmg * talentBonusDmgMult * normalProtMult - reducedDefNormal);

    // 6. 세이크리드 가드 5대 스킬 데미지 연산 (아르카나 곱연산보댐 공식 적용)
    // 크리티컬 배율 공통 정의
    const critMult = 2.5 + (addCrit / 100);

    // [1] 성역 전개:
    const rawSanctuary = res0 * 3.0 + finalDef * 1.5 + finalHp * 0.2;
    const sanctuaryNormal = Math.max(0, equipBonusDmgMult * (rawSanctuary * arcanaBonusDmgMult) * arcanaBonusDmgMult * normalProtMult - reducedDefNormal);
    const sanctuaryCrit = sanctuaryNormal * critMult;

    // [2] 철벽 강타:
    const rawIronwallArcana = res0 * 12.0 + finalDef * 6.0 + finalHp * 1.0;
    const ironwallNormal = Math.max(0, equipBonusDmgMult * ( (rawWindmillDmg * 1.5) * normalBonusDmgMult * doubleProtMult + rawIronwallArcana * arcanaBonusDmgMult * normalProtMult ) * arcanaBonusDmgMult - reducedDefNormal);
    const ironwallCrit = ironwallNormal * critMult;

    // [2.5] 단죄의 일격 1단계:
    const rawCondemnation1Arcana = res0 * 15.0 + finalDef * 9.0 + finalHp * 1.5;
    const condemnation1Normal = Math.max(0, equipBonusDmgMult * ( (rawWindmillDmg * 1.75) * normalBonusDmgMult * doubleProtMult + rawCondemnation1Arcana * arcanaBonusDmgMult * normalProtMult ) * arcanaBonusDmgMult - reducedDefNormal);
    const condemnation1Crit = condemnation1Normal * critMult;

    // [2.6] 단죄의 일격 2단계:
    const rawCondemnation2Arcana = res0 * 22.5 + finalDef * 13.5 + finalHp * 2.25;
    const condemnation2Normal = Math.max(0, equipBonusDmgMult * ( (rawWindmillDmg * 1.75) * normalBonusDmgMult * doubleProtMult + rawCondemnation2Arcana * arcanaBonusDmgMult * normalProtMult ) * arcanaBonusDmgMult - reducedDefNormal);
    const condemnation2Crit = condemnation2Normal * critMult;

    // [2.7] 단죄의 일격 3단계:
    const rawCondemnation3Arcana = res0 * 30.0 + finalDef * 18.0 + finalHp * 3.0;
    const condemnation3Normal = Math.max(0, equipBonusDmgMult * ( (rawWindmillDmg * 1.75) * normalBonusDmgMult * doubleProtMult + rawCondemnation3Arcana * arcanaBonusDmgMult * normalProtMult ) * arcanaBonusDmgMult - reducedDefNormal);
    const condemnation3Crit = condemnation3Normal * critMult;

    // [3] 심판의 일격:
    const rawJudgmentArcana = res0 * 35.0 + finalDef * 20.0 + finalHp * 5.0;
    const judgmentNormal = Math.max(0, equipBonusDmgMult * ( (rawWindmillDmg * 2.0) * normalBonusDmgMult * doubleProtMult + rawJudgmentArcana * arcanaBonusDmgMult * normalProtMult ) * arcanaBonusDmgMult - reducedDefNormal);
    const judgmentCrit = judgmentNormal * critMult;

    // [4] 격돌:
    const rawClashArcana = res0 * 8.0 + finalDef * 6.0 + finalHp * 0.5;
    const clashNormal = Math.max(0, equipBonusDmgMult * ( (rawChargeDmg * 1.5) * normalBonusDmgMult * doubleProtMult + rawClashArcana * arcanaBonusDmgMult * normalProtMult ) * arcanaBonusDmgMult - reducedDefNormal);
    const clashCrit = clashNormal * critMult;

    // [5] 희생의 응징:
    const rawRetributionArcana = (res0 * 60.0 + finalDef * 40.0 + finalHp * 15.0) * (1 + shield.drr / 100);
    const retributionNormal = Math.max(0, equipBonusDmgMult * (rawRetributionArcana * arcanaBonusDmgMult) * arcanaBonusDmgMult * normalProtMult - reducedDefNormal);
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
    const formatArcanaMath = (title, rawTalent, talentLabel, talentMult, doubleProt, rawArcana, arcanaLabel, arcanaDmgMult, normalProt, equipMult, normalDef, finalVal) => {
        return `
            <div class="math-step">
                <span class="math-step-num">1단계 기저데미지</span>
                <span class="math-step-text">
                    - ${talentLabel} 파트: <strong>${Math.floor(rawTalent).toLocaleString()}</strong> 데미지<br>
                    - 아르카나 파트: <strong>${Math.floor(rawArcana).toLocaleString()}</strong> 데미지
                </span>
            </div>
            <div class="math-step">
                <span class="math-step-num">2단계 피어싱 & 보댐 적용</span>
                <span class="math-step-text">
                    - ${talentLabel} 파트: ${Math.floor(rawTalent).toLocaleString()} &times; ${talentMult.toFixed(4)} [일반보댐] &times; ${doubleProt.toFixed(4)} [이중피어싱 댐감율] = <strong>${Math.floor(rawTalent * talentMult * doubleProt).toLocaleString()}</strong><br>
                    - 아르카나 파트: ${Math.floor(rawArcana).toLocaleString()} &times; ${arcanaDmgMult.toFixed(4)} [아르카나보댐] &times; ${normalProt.toFixed(4)} [기본피어싱 댐감율] = <strong>${Math.floor(rawArcana * arcanaDmgMult * normalProt).toLocaleString()}</strong>
                </span>
            </div>
            <div class="math-step">
                <span class="math-step-num">3단계 최종 합산</span>
                <span class="math-step-text">
                    - 최종 데미지 = ${equipMult.toFixed(4)} [장비보댐] &times; [ ${Math.floor(rawTalent * talentMult * doubleProt).toLocaleString()} (재능) + ${Math.floor(rawArcana * arcanaDmgMult * normalProt).toLocaleString()} (아르카나) ] &times; ${arcanaDmgMult.toFixed(4)} [아르카나보댐] - ${Math.floor(normalDef)} [적방어]
                </span>
            </div>
            <div class="math-final">
                결과 = <strong>${Math.floor(finalVal).toLocaleString()}</strong>
            </div>
        `;
    };

    const formatArcanaOnlyMath = (title, rawArcana, arcanaLabel, normalProt, equipMult, arcanaDmgMult, normalDef, finalVal) => {
        return `
            <div class="math-step">
                <span class="math-step-num">1단계 기저데미지</span>
                <span class="math-step-text">
                    - 아르카나 기저: <strong>${Math.floor(rawArcana).toLocaleString()}</strong> 데미지
                </span>
            </div>
            <div class="math-step">
                <span class="math-step-num">2단계 피어싱 & 보댐 적용</span>
                <span class="math-step-text">
                    - 아르카나 파트: ${Math.floor(rawArcana).toLocaleString()} &times; ${arcanaDmgMult.toFixed(4)} [아르카나보댐] &times; ${normalProt.toFixed(4)} [기본피어싱 댐감율] = <strong>${Math.floor(rawArcana * arcanaDmgMult * normalProt).toLocaleString()}</strong>
                </span>
            </div>
            <div class="math-step">
                <span class="math-step-num">3단계 최종 합산</span>
                <span class="math-step-text">
                    - 최종 데미지 = ${equipMult.toFixed(4)} [장비보댐] &times; ${Math.floor(rawArcana * arcanaDmgMult * normalProt).toLocaleString()} &times; ${arcanaDmgMult.toFixed(4)} [아르카나보댐] - ${Math.floor(normalDef)} [적방어]
                </span>
            </div>
            <div class="math-final">
                결과 = <strong>${Math.floor(finalVal).toLocaleString()}</strong>
            </div>
        `;
    };

    const formatTalentMath = (title, rawTalent, talentLabel, talentMult, normalProt, normalDef, finalVal) => {
        return `
            <div class="math-step">
                <span class="math-step-num">1단계 기저데미지</span>
                <span class="math-step-text">
                    - ${talentLabel} 기저: <strong>${Math.floor(rawTalent).toLocaleString()}</strong> 데미지
                </span>
            </div>
            <div class="math-step">
                <span class="math-step-num">2단계 피어싱 & 보댐 적용</span>
                <span class="math-step-text">
                    - 최종 데미지 = ${Math.floor(rawTalent).toLocaleString()} &times; ${talentMult.toFixed(4)} [보너스대미지] &times; ${normalProt.toFixed(4)} [기본피어싱 댐감율] - ${Math.floor(normalDef)} [적방어]
                </span>
            </div>
            <div class="math-final">
                결과 = <strong>${Math.floor(finalVal).toLocaleString()}</strong>
            </div>
        `;
    };

    document.getElementById("math-sanctuary").innerHTML = 
        formatArcanaOnlyMath("성역 전개", rawSanctuary, "성역", normalProtMult, equipBonusDmgMult, arcanaBonusDmgMult, reducedDefNormal, sanctuaryNormal);

    document.getElementById("math-ironwall").innerHTML = 
        formatArcanaMath("철벽 강타", rawWindmillDmg * 1.5, "윈드밀", normalBonusDmgMult, doubleProtMult, rawIronwallArcana, "아르카나", arcanaBonusDmgMult, normalProtMult, equipBonusDmgMult, reducedDefNormal, ironwallNormal);

    document.getElementById("math-condemnation1").innerHTML = 
        formatArcanaMath("단죄의 일격 1단계", rawWindmillDmg * 1.75, "윈드밀", normalBonusDmgMult, doubleProtMult, rawCondemnation1Arcana, "아르카나", arcanaBonusDmgMult, normalProtMult, equipBonusDmgMult, reducedDefNormal, condemnation1Normal);

    document.getElementById("math-condemnation2").innerHTML = 
        formatArcanaMath("단죄의 일격 2단계", rawWindmillDmg * 1.75, "윈드밀", normalBonusDmgMult, doubleProtMult, rawCondemnation2Arcana, "아르카나", arcanaBonusDmgMult, normalProtMult, equipBonusDmgMult, reducedDefNormal, condemnation2Normal);

    document.getElementById("math-condemnation3").innerHTML = 
        formatArcanaMath("단죄의 일격 3단계", rawWindmillDmg * 1.75, "윈드밀", normalBonusDmgMult, doubleProtMult, rawCondemnation3Arcana, "아르카나", arcanaBonusDmgMult, normalProtMult, equipBonusDmgMult, reducedDefNormal, condemnation3Normal);

    document.getElementById("math-judgment").innerHTML = 
        formatArcanaMath("심판의 일격", rawWindmillDmg * 2.0, "윈드밀", normalBonusDmgMult, doubleProtMult, rawJudgmentArcana, "아르카나", arcanaBonusDmgMult, normalProtMult, equipBonusDmgMult, reducedDefNormal, judgmentNormal);

    document.getElementById("math-clash").innerHTML = 
        formatArcanaMath("격돌", rawChargeDmg * 1.5, "돌진", normalBonusDmgMult, doubleProtMult, rawClashArcana, "아르카나", arcanaBonusDmgMult, normalProtMult, equipBonusDmgMult, reducedDefNormal, clashNormal);

    document.getElementById("math-retribution").innerHTML = 
        formatArcanaOnlyMath("희생의 응징", rawRetributionArcana, "응징", normalProtMult, equipBonusDmgMult, arcanaBonusDmgMult, reducedDefNormal, retributionNormal);

    document.getElementById("math-smash").innerHTML = 
        formatTalentMath("스매시", rawSmashDmg, "스매시", talentBonusDmgMult, normalProtMult, reducedDefNormal, smashDmg);

    document.getElementById("math-bash").innerHTML = 
        formatTalentMath("배쉬", rawBashSkillDmg, "배쉬", talentBonusDmgMult, normalProtMult, reducedDefNormal, bashSkillDmg);

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
