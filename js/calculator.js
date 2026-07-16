/**
 * 마비노기 세이크리드 가드 데미지 계산기 - 계산 및 UI 엔진
 */

// 로컬 스토리지 연동 빌드 데이터 목록
let savedBuilds = JSON.parse(localStorage.getItem("sacred_guard_saved_builds") || "[]");
let activeCompareBuildId = localStorage.getItem("sacred_guard_active_compare_id") || null;
let activeLoadedBuildId = null; // 현재 불러와 적용된 빌드 ID
let isCalculatingBase = false; // 빌드 비교용 기저 계산 수행 여부 플래그

// 오검 옵션 데이터베이스 정의
const OGEOM_OPTIONS_DB = {
    none: { text: "옵션 없음", scale: 0 },
    charge: { text: "돌진 대미지 배율 (+3% / Lv)", scale: 3 },
    windmill: { text: "윈드밀 대미지 배율 (+2% / Lv)", scale: 2 },
    smash: { text: "스매시 대미지 배율 (+2.5% / Lv)", scale: 2.5 },
    axemastery: { text: "액스 마스터리 최댐 (+1 / Lv)", scale: 1 },
    sanctuary: { text: "성역 전개 대미지 배율 (+1% / Lv)", scale: 1 },
    ironwall: { text: "철벽 강타 대미지 배율 (+5% / Lv)", scale: 5 },
    condemnation: { text: "광휘의 단죄 단계당 대미지 배율 (+0.8% / Lv)", scale: 0.8 },
    judgment: { text: "심판의 일격 대미지 배율 (+20% / Lv)", scale: 20 },
    clash: { text: "격돌 대미지 배율 (+10% / Lv)", scale: 10 },
};

const OGEOM_NORMAL_KEYS = ["none", "charge", "windmill", "smash", "axemastery"];
const OGEOM_SPECIAL_KEYS = ["none", "sanctuary", "ironwall", "condemnation", "judgment", "clash", "charge", "windmill", "smash", "axemastery"];

// 오검 조합 UI 및 설명 갱신 함수
function updateOgeomSynergyUI() {
    const synergySelect = document.getElementById("ogeom-synergy");
    const scoreSelect = document.getElementById("ogeom-synergy-score");
    const imgContainer = document.getElementById("ogeom-synergy-img-container");
    const imgEl = document.getElementById("ogeom-synergy-img");
    const descBox = document.getElementById("ogeom-synergy-desc-box");
    if (!synergySelect || !scoreSelect || !imgContainer || !imgEl || !descBox) return;

    const synergy = synergySelect.value;
    const score = parseInt(scoreSelect.value) || 9;

    if (synergy === "none") {
        scoreSelect.disabled = true;
        imgContainer.style.display = "none";
        descBox.style.display = "none";
    } else {
        scoreSelect.disabled = false;
        imgContainer.style.display = "flex";
        descBox.style.display = "block";

        if (synergy === "fortress") {
            imgEl.src = "images/철.webp";
            const wmBonus = 5 + 5 * (score - 5);
            const baseDmgBonus = 200 + 100 * (score - 5);
            const fortressBonus = 10 + 5 * (score - 5);
            descBox.textContent = `[철벽 강타: 요새] 조합 적용 중 (${score}점)\n• 철벽 강타의 윈드밀 대미지 배율 +${wmBonus}% 증가\n• 철벽 강타의 아르카나 기본 대미지 배율 +${baseDmgBonus}%, 방어력 배율 +300%, 최대 생명력 배율 +50% 증가\n• 공격 범위: 6m, 공격 각도: 150도\n• 요새화 지속 시간: 15초 (중첩당 공격 스킬 희생 획득량 +${fortressBonus}% 증가, 최대 3중첩)\n• 누적 쿨타임 한계: 12초`;
        } else if (synergy === "execution") {
            imgEl.src = "images/단.webp";
            const mult = 1.1 + 0.1 * (score - 5);
            const condDist = 6 + 0.5 * (score - 5);
            descBox.textContent = `[광휘의 단죄: 집행] 조합 적용 중 (${score}점)\n• 광휘의 단죄가 상시 3단계로 동작\n• 광휘의 단죄의 아르카나 기본 대미지, 방어력, 최대 생명력 배율 ${mult.toFixed(1)}배 증가\n• 스킬로 이동 가능한 거리 : 최대 ${condDist.toFixed(1)}m\n• 고결한 서약 활성화 상태일 경우 희생 4 획득\n• 재사용 대기 시간 2.5초`;
        }
    }
}

// 특수 오검 착용 개수 강제 제한 함수 (조합 활성화 시 최대 3개, 비활성화 시 최대 5개)
function enforceSpecialOgeomLimit(changedSlotIdx) {
    const synergySelect = document.getElementById("ogeom-synergy");
    if (!synergySelect) return;

    const limit = (synergySelect.value === "none") ? 5 : 3;

    let specialSlots = [];
    for (let i = 1; i <= 5; i++) {
        const typeSelect = document.getElementById(`ogeom-${i}-type`);
        if (typeSelect && typeSelect.value === "special") {
            specialSlots.push(i);
        }
    }

    if (specialSlots.length > limit) {
        let demotedCount = 0;
        const targetDemoteCount = specialSlots.length - limit;
        
        // 사용자가 방금 변경한 슬롯(changedSlotIdx)을 제외하고 역순으로 강등 대상 탐색
        const candidates = specialSlots.filter(idx => idx !== changedSlotIdx).reverse();
        for (let idx of candidates) {
            const typeSelect = document.getElementById(`ogeom-${idx}-type`);
            if (typeSelect) {
                typeSelect.value = "normal";
                updateOgeomOptions(idx);
                demotedCount++;
                if (demotedCount >= targetDemoteCount) break;
            }
        }

        // 그래도 더 강등해야 하는 극한 상황인 경우 자신을 강등
        if (demotedCount < targetDemoteCount) {
            const typeSelect = document.getElementById(`ogeom-${changedSlotIdx}-type`);
            if (typeSelect) {
                typeSelect.value = "normal";
                updateOgeomOptions(changedSlotIdx);
            }
        }
    }
}

// 오검 초기화 함수
function initOgeom() {
    // 오검 조합 드롭다운 리스너 추가
    const synergySelect = document.getElementById("ogeom-synergy");
    const scoreSelect = document.getElementById("ogeom-synergy-score");
    if (synergySelect) {
        synergySelect.addEventListener("change", () => {
            enforceSpecialOgeomLimit(-1);
            updateOgeomSynergyUI();
            calculate();
        });
    }
    if (scoreSelect) {
        scoreSelect.addEventListener("change", () => {
            updateOgeomSynergyUI();
            calculate();
        });
    }

    const container = document.getElementById("ogeom-grid-container");
    if (!container) return;

    container.innerHTML = "";
    for (let i = 1; i <= 5; i++) {
        const isSpecialDefault = (i <= 3);
        const stoneFieldset = document.createElement("fieldset");
        stoneFieldset.className = "skill-fieldset ogeom-stone-fieldset";
        stoneFieldset.style.cssText = "margin-bottom: 0.75rem; padding: 0.6rem 0.8rem; background: rgba(255, 255, 255, 0.01);";
        
        stoneFieldset.innerHTML = `
            <legend style="display: flex; align-items: center; gap: 0.4rem; padding: 0 0.4rem; float: none;">
                <span>오검 #${i}</span>
                <select class="ogeom-type-select select-xs" id="ogeom-${i}-type" style="width: 78px; font-size: 0.65rem; padding: 0.1rem 0.2rem; background: rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.15);">
                    <option value="none">장착 해제</option>
                    <option value="normal" ${!isSpecialDefault ? "selected" : ""}>일반 오검</option>
                    <option value="special" ${isSpecialDefault ? "selected" : ""}>특수 오검</option>
                </select>
            </legend>
            <div class="ogeom-options-container" id="ogeom-${i}-options-container" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; width: 100%;">
                ${[1, 2, 3].map(j => `
                    <div class="form-group" style="margin: 0; min-width: 0;">
                        <label style="font-size: 0.65rem; color: var(--text-secondary); margin-bottom: 0.15rem; display: block;">옵션 ${j}</label>
                        <div style="display: flex; gap: 0.15rem; align-items: center; min-width: 0;">
                            <select class="ogeom-opt-select select-xs" id="ogeom-${i}-opt-${j}" style="flex: 1; min-width: 0; font-size: 0.65rem; padding: 0.15rem 0.2rem;"></select>
                            <select class="ogeom-level-select select-xs" id="ogeom-${i}-lv-${j}" style="width: 44px; flex-shrink: 0; font-size: 0.65rem; padding: 0.15rem 0.1rem; text-align: center;">
                            </select>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
        container.appendChild(stoneFieldset);

        // Populate options initially
        updateOgeomOptions(i);

        // Bind type select change
        const typeSelect = document.getElementById(`ogeom-${i}-type`);
        if (typeSelect) {
            typeSelect.addEventListener("change", () => {
                if (typeSelect.value === "special") {
                    enforceSpecialOgeomLimit(i);
                }
                updateOgeomOptions(i);
                calculate();
            });
        }

        // Bind option and level selects change
        for (let j = 1; j <= 3; j++) {
            const optSel = document.getElementById(`ogeom-${i}-opt-${j}`);
            const lvSel = document.getElementById(`ogeom-${i}-lv-${j}`);
            if (optSel) {
                optSel.addEventListener("change", () => {
                    updateOgeomOptions(i, true);
                    calculate();
                });
            }
            if (lvSel) lvSel.addEventListener("change", calculate);
        }
    }
}

// 오검 타입 변경 시 하위 옵션 목록 필터링 및 동적 UI 토글
function updateOgeomOptions(i, userTriggered = false) {
    const typeSelect = document.getElementById(`ogeom-${i}-type`);
    const optionsContainer = document.getElementById(`ogeom-${i}-options-container`);
    if (!typeSelect || !optionsContainer) return;

    const type = typeSelect.value;
    if (type === "none") {
        optionsContainer.style.display = "none";
        // Reset option values to none
        for (let j = 1; j <= 3; j++) {
            const optSel = document.getElementById(`ogeom-${i}-opt-${j}`);
            if (optSel) {
                optSel.value = "none";
            }
        }
    } else {
        optionsContainer.style.display = "grid";
        const baseKeys = (type === "special") ? OGEOM_SPECIAL_KEYS : OGEOM_NORMAL_KEYS;
        
        // 3개의 행에 대해 각각 필터링하여 드롭다운 구성 (동일 오검 내 중복 선택 금지)
        for (let j = 1; j <= 3; j++) {
            const optSel = document.getElementById(`ogeom-${i}-opt-${j}`);
            const lvSel = document.getElementById(`ogeom-${i}-lv-${j}`);
            if (!optSel || !lvSel) continue;

            const currentVal = optSel.value || "none";
            const currentLv = parseInt(lvSel.value) || 1;

            // 다른 행에서 이미 선택한 값들을 제외 목록으로 수집
            const selectedInOthers = [];
            for (let k = 1; k <= 3; k++) {
                if (k !== j) {
                    const otherSel = document.getElementById(`ogeom-${i}-opt-${k}`);
                    if (otherSel && otherSel.value && otherSel.value !== "none") {
                        selectedInOthers.push(otherSel.value);
                    }
                }
            }

            // 중복 옵션을 필터링한 키 목록 구성 (none은 항상 허용)
            const filteredKeys = baseKeys.filter(key => key === "none" || !selectedInOthers.includes(key));

            const existingKeys = Array.from(optSel.options).map(o => o.value);
            const keysMatch = (existingKeys.length === filteredKeys.length) && existingKeys.every((v, idx) => v === filteredKeys[idx]);

            if (!keysMatch) {
                optSel.innerHTML = "";
                filteredKeys.forEach(key => {
                    const opt = document.createElement("option");
                    opt.value = key;
                    opt.textContent = OGEOM_OPTIONS_DB[key].text;
                    optSel.appendChild(opt);
                });

                if (filteredKeys.includes(currentVal)) {
                    optSel.value = currentVal;
                } else {
                    optSel.value = "none";
                }
            }

            // [재능 스킬에 대한 20레벨 확장 처리 및 레벨 제한 동적 반영]
            const isTalent = ["charge", "windmill", "smash", "bash"].includes(optSel.value);
            const maxLv = isTalent ? 20 : 10;

            if (lvSel.options.length !== maxLv) {
                lvSel.innerHTML = "";
                for (let k = 1; k <= maxLv; k++) {
                    const opt = document.createElement("option");
                    opt.value = k;
                    opt.textContent = `${k}Lv`;
                    lvSel.appendChild(opt);
                }
            }

            // 레벨값 복원 및 범위 제한 clamping (사용자 조작시 기본적으로 max레벨 할당)
            if (userTriggered && optSel.value !== "none") {
                lvSel.value = maxLv;
            } else if (currentLv <= maxLv) {
                lvSel.value = currentLv;
            } else {
                lvSel.value = maxLv;
            }
        }
    }
}

// DOM 요소 바인딩 및 초기화
document.addEventListener("DOMContentLoaded", () => {
    initDropdowns();
    setupEventListeners();
    setupSkillCardBreakdownToggles();
    setupInputCardCollapse();
    renderSavedBuildsList();
    calculate(); // 초기 연산 수행
});

// 드롭다운 항목 바인딩
function initDropdowns() {
    initOgeom();
    // 1. 무기 목록 바인딩
    const weaponSelect = document.getElementById("equip-weapon");
    weaponSelect.innerHTML = "";
    Object.keys(WEAPON_DATA).forEach(key => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = WEAPON_DATA[key].name;
        weaponSelect.appendChild(option);
    });
    weaponSelect.value = 'axe_soul_liberate';

    // 1.5. 방패 목록 바인딩
    const shieldSelect = document.getElementById("equip-shield");
    shieldSelect.innerHTML = "";
    Object.keys(SHIELD_DATA).forEach(key => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = SHIELD_DATA[key].name;
        shieldSelect.appendChild(option);
    });
    shieldSelect.value = 'shield_soul_liberate';

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
    document.getElementById("equip-set-windmill-old").checked = false;
    document.getElementById("equip-set-windmill-new").checked = true;
}

// 이벤트 리스너 바인딩
function setupEventListeners() {
    // 모든 수치 입력 요소에 실시간 계산 트리거 추가
    const inputElements = document.querySelectorAll(
        "input[type='number'], select, input[type='checkbox'], input[type='radio']"
    );
    inputElements.forEach(elem => {
        elem.addEventListener("input", () => {
            activeLoadedBuildId = null; // 수동 값 변경 시 적용된 빌드 상태 초기화
            renderSavedBuildsList(); // 배지 업데이트를 위해 리스트 갱신
            calculate();
        });
        elem.addEventListener("change", () => {
            activeLoadedBuildId = null; // 수동 값 변경 시 적용된 빌드 상태 초기화
            renderSavedBuildsList(); // 배지 업데이트를 위해 리스트 갱신
            calculate();
        });
    });

    // ALL 디버프 토글 버튼
    const allToggle = document.getElementById("debuff-all");
    allToggle.addEventListener("change", () => {
        const checked = allToggle.checked;
        document.querySelectorAll(".debuff-item").forEach(cb => { cb.checked = checked; });
        calculate();
    });

    // 개별 디버프 해제 시 ALL 동기화
    document.querySelectorAll(".debuff-item").forEach(cb => {
        cb.addEventListener("change", () => {
            const all = document.querySelectorAll(".debuff-item");
            const allChecked = [...all].every(c => c.checked);
            document.getElementById("debuff-all").checked = allChecked;
        });
    });

    // 빌드 비교 제어 버튼 리스너
    document.getElementById("btn-save-build").addEventListener("click", saveCurrentBuild);
    document.getElementById("btn-reset-build").addEventListener("click", resetBuildComparison);

    // 상지/급관 택1 제어
    const buffSangji = document.getElementById("buff-sangji");
    const buffGupkwan = document.getElementById("buff-gupkwan");
    if (buffSangji && buffGupkwan) {
        buffSangji.addEventListener("change", () => {
            if (buffSangji.checked && buffGupkwan.checked) {
                buffGupkwan.checked = false;
                calculate();
            }
        });
        buffGupkwan.addEventListener("change", () => {
            if (buffGupkwan.checked && buffSangji.checked) {
                buffSangji.checked = false;
                calculate();
            }
        });
    }
}


// 데미지 및 스탯 핵심 연산
function calculate() {
    const f = (val, maxDec = 4) => parseFloat(val.toFixed(maxDec)).toString();
    // 1. 입력 수치 파싱
    const maxDmg = Math.max(0, parseFloat(document.getElementById("stat-max-dmg").value) || 0);

    // 오검 조합 파싱
    const ogeomSynergySelect = document.getElementById("ogeom-synergy");
    const ogeomSynergy = ogeomSynergySelect ? ogeomSynergySelect.value : "none";
    const ogeomSynergyScoreSelect = document.getElementById("ogeom-synergy-score");
    const ogeomSynergyScore = ogeomSynergyScoreSelect ? (parseInt(ogeomSynergyScoreSelect.value) || 5) : 5;

    // 오검 설정 파싱 및 수치 합산
    let ogeomDmgWindmill = 0;
    let ogeomDmgCharge = 0;
    let ogeomDmgSmash = 0;
    let ogeomDmgBash = 0;
    let ogeomMaxDmg = 0;
    let ogeomDmgSanctuary = 0;
    let ogeomDmgIronwall = 0;
    let ogeomDmgCondemnation = 0;
    let ogeomDmgJudgment = 0;
    let ogeomDmgClash = 0;
    let ogeomDmgRetribution = 0;

    for (let i = 1; i <= 5; i++) {
        const typeSelect = document.getElementById(`ogeom-${i}-type`);
        if (!typeSelect || typeSelect.value === "none") continue;

        for (let j = 1; j <= 3; j++) {
            const optSel = document.getElementById(`ogeom-${i}-opt-${j}`);
            const lvSel = document.getElementById(`ogeom-${i}-lv-${j}`);
            if (!optSel || !lvSel) continue;

            const opt = optSel.value;
            const lv = parseInt(lvSel.value) || 0;
            if (opt === "none" || lv <= 0) continue;

            const scale = OGEOM_OPTIONS_DB[opt].scale;
            const val = scale * lv;

            if (opt === "windmill") ogeomDmgWindmill += val;
            else if (opt === "charge") ogeomDmgCharge += val;
            else if (opt === "smash") ogeomDmgSmash += val;
            else if (opt === "bash") ogeomDmgBash += val;
            else if (opt === "axemastery") ogeomMaxDmg += val;
            else if (opt === "sanctuary") ogeomDmgSanctuary += val;
            else if (opt === "ironwall") ogeomDmgIronwall += val;
            else if (opt === "condemnation") ogeomDmgCondemnation += val;
            else if (opt === "judgment") ogeomDmgJudgment += val;
            else if (opt === "clash") ogeomDmgClash += val;
            else if (opt === "retribution") ogeomDmgRetribution += val;
        }
    }
    const baseDef = Math.max(0, parseFloat(document.getElementById("stat-defense").value) || 0);
    const maxHp = Math.max(0, parseFloat(document.getElementById("stat-max-hp").value) || 0);
    const addCrit = parseFloat(document.getElementById("stat-add-crit").value) || 0;
    const bonusDmg = parseFloat(document.getElementById("stat-bonus-dmg").value) || 0;
    const arcanaBonusDmg = parseFloat(document.getElementById("stat-arcana-bonus-dmg").value) || 0;
    let charPiercing = Math.max(0, parseInt(document.getElementById("stat-piercing").value) || 0);

    // 적 정보 설정 파싱 (TARGET_DATA 연동)
    const targetKey = document.getElementById("target-monster").value;
    const target = TARGET_DATA[targetKey];
    document.getElementById("target-desc").textContent = target.description;

    const targetProt = target.prot;
    const targetDef = target.def;
    const targetPiercingRes = target.piercingRes;

    // 디버프 설정 파싱
    const debuffCorgi = document.getElementById("debuff-corgi").checked;
    const debuffHades = document.getElementById("debuff-hades").checked;
    const debuffCart = document.getElementById("debuff-cart").checked;
    const debuffPraga = document.getElementById("debuff-praga").checked;
    const debuffUpper = document.getElementById("debuff-upper").checked;
    const debuffUpperValue = parseFloat(document.getElementById("debuff-upper-value").value) || 0;
    const debuffJack = document.getElementById("debuff-jack").checked;
    const debuffSonic = document.getElementById("debuff-sonic").checked;
    const sonicValue = parseFloat(document.getElementById("debuff-sonic-value").value) || 0;
    const debuffDeathmarker = document.getElementById("debuff-deathmarker").checked;
    const debuffDeathmarkerValue = parseFloat(document.getElementById("debuff-deathmarker-value").value) || 0;
    const debuffDeathmarkerSaren = document.getElementById("debuff-deathmarker-saren").checked;
    const debuffMomo = document.getElementById("debuff-momo").checked;
    const debuffMagigraffDefprot = document.getElementById("debuff-magigraff-defprot").checked;
    const debuffKun = document.getElementById("debuff-kun").checked;

    // 데스 마커 및 어퍼 라벨 동적 갱신
    // 데스마커: 세공 1레벨당 0.25% 증가, 스아렌 체크 시 3% 추가
    const deathmarkerValueTotal = 53 + (debuffDeathmarkerValue * 0.25) + (debuffDeathmarkerSaren ? 3 : 0);
    const deathmarkerTotalValEl = document.getElementById("deathmarker-total-val");
    if (deathmarkerTotalValEl) {
        deathmarkerTotalValEl.textContent = parseFloat(deathmarkerValueTotal.toFixed(2));
    }

    // 어퍼: 세공 1레벨당 1 감소
    const upperValueTotal = 23 + (debuffUpperValue * 1);
    const upperTotalFlatEl = document.getElementById("upper-total-flat");
    if (upperTotalFlatEl) {
        upperTotalFlatEl.textContent = upperValueTotal;
    }

    // 음파의 세례: 1단계당 5 감소
    const sonicTotalFlatEl = document.getElementById("sonic-total-flat");
    if (sonicTotalFlatEl) {
        sonicTotalFlatEl.textContent = sonicValue * 5;
    }

    // 어퍼+급소 관통: 고정 -(23 + debuffUpperValue) + 몬스터 보호의 11% 비율 감소
    let debuffProtPercent = 0;
    if (debuffUpper) debuffProtPercent += 0.11;
    const protAfterPercent = Math.max(0, targetProt * (1 - debuffProtPercent));

    // 고정 보호 감소 디버프
    let debuffProtFlat = 0;
    if (debuffCorgi) debuffProtFlat += 15;
    if (debuffHades) debuffProtFlat += 10;
    if (debuffCart) debuffProtFlat += 3;
    if (debuffPraga) debuffProtFlat += 15;
    if (debuffUpper) debuffProtFlat += upperValueTotal;
    if (debuffJack) debuffProtFlat += 4;
    if (debuffSonic) debuffProtFlat += sonicValue * 5;
    if (debuffMagigraffDefprot) debuffProtFlat += 10; // 방보 마기 보호 -10

    // 고정 방어 감소 디버프
    let debuffDefFlat = 0;
    if (debuffMagigraffDefprot) debuffDefFlat += 10; // 방보 마기 방어 -10

    // 증댐 디버프
    let debuffgainFlat = 0;
    if (debuffDeathmarker) debuffgainFlat += deathmarkerValueTotal;
    if (debuffMomo) debuffgainFlat += 15;

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
    const buffSebaBonus = document.getElementById("buff-seba-bonus").checked;
    const buffSangji = document.getElementById("buff-sangji").checked;
    const buffGupkwan = document.getElementById("buff-gupkwan").checked;

    // 물공포 체크
    const potionActive = document.querySelector("input[name='buff-potion']:checked").value === "1";
    const bashVal = parseFloat(document.getElementById("buff-bash").value) || 0;

    // 약점 분석 및 명장의 연마재 파싱
    const buffWeaknessAnalysis = document.getElementById("buff-weakness-analysis").checked;
    const buffMasterAbrasive = document.getElementById("buff-master-abrasive").checked;

    // 유물 레벨 및 성찰의 흔적 파싱
    const relicRetribution = parseInt(document.getElementById("relic-retribution").value) || 0;
    const relicJudgment = parseInt(document.getElementById("relic-judgment").value) || 0;
    const buffReflectionTrace = document.getElementById("buff-reflection-trace").checked;
    const buffLeim = document.getElementById("buff-leim").checked;
    const buffLeimMagigraff = document.getElementById("buff-leim-magigraff").checked;
    const buffProPack = document.getElementById("buff-pro-pack").checked;

    // 정령 실체화 및 실체화 강화 파싱 및 상태 동기화
    const buffSpiritTransformEl = document.getElementById("buff-spirit-transform");
    const buffSpiritTransformEnhanceEl = document.getElementById("buff-spirit-transform-enhance");
    if (buffSpiritTransformEl && buffSpiritTransformEnhanceEl) {
        buffSpiritTransformEnhanceEl.disabled = !buffSpiritTransformEl.checked;
        if (!buffSpiritTransformEl.checked) {
            buffSpiritTransformEnhanceEl.checked = false;
        }
    }
    const buffSpiritTransform = buffSpiritTransformEl ? buffSpiritTransformEl.checked : false;
    const buffSpiritTransformEnhance = buffSpiritTransformEnhanceEl ? buffSpiritTransformEnhanceEl.checked : false;

    // 이면 및 이면 토템 파싱 및 상태 동기화
    const debuffImenEl = document.getElementById("debuff-imen");
    const debuffImenTotemEl = document.getElementById("debuff-imen-totem");
    if (debuffImenEl && debuffImenTotemEl) {
        debuffImenTotemEl.disabled = !debuffImenEl.checked;
        if (!debuffImenEl.checked) {
            debuffImenTotemEl.checked = false;
        }
    }
    const debuffImen = debuffImenEl ? debuffImenEl.checked : false;
    const debuffImenTotem = debuffImenTotemEl ? debuffImenTotemEl.checked : false;
    
    const imenTotalPctEl = document.getElementById("imen-total-pct");
    if (imenTotalPctEl) {
        imenTotalPctEl.textContent = debuffImenTotem ? "5" : "3";
    }

    // 마기그래프 파싱
    const buffMagigraffCharge = document.getElementById("buff-magigraff-charge").checked;
    const buffMagigraffSmash = document.getElementById("buff-magigraff-smash").checked;
    const buffMagigraffBash = document.getElementById("buff-magigraff-bash").checked;

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
    const weaponTwoHandedSmashBonus = weapon.twoHandedSmashBonus; // 양손검 20% 보너스
    const weaponSmashBonus = weapon.smashBonus;
    const weaponBashBonus = weapon.bashBonus;


    document.getElementById("weapon-desc").textContent =
        `${weapon.description} (양손 스매${weaponTwoHandedSmashBonus * 100}%, 무기 스매시 보너스: ${weaponSmashBonus * 100}%, 배쉬 보너스: ${weaponBashBonus * 100}%)`;

    const shieldDmgText = (weapon.type === "twohanded") ? "적용 불가 (양손검)" : `+${shield.bonusDmg}%`;
    document.getElementById("shield-desc").textContent =
        `${shield.description} (대미지 감소율: ${shield.drr}%, 보너스 데미지: ${shieldDmgText})`;

    // 3. 라데카 스킬에 따른 계수 보정
    // 마이트 오브 라데카: raw 재능값에 곱산 (15%)
    // 브레스 오브 라데카: 일반 보댐에 합산 (5%)
    let ladecaMult = 1.0;
    let ladecaBreathBonus = 0; // 브레스일 때 일반보댐에 합산될 % 값
    if (ladeca === "might") {
        ladecaMult = 1.15; // 자이언트 마이트 15% 곱연산
    } else if (ladeca === "breath") {
        ladecaBreathBonus = 5; // 인간 브레스 5% → 일반보댐 합산
    }
    // 엘프(none)는 곱연산 없음 (1.0)

    // 4. 최종 스탯 연산
    // 최종 보정 맥댐 ((기본맥 * 물공포) * (1 + 전장 * 물공포) * (1 + 상지 * 물공포))
    const potionFactor = potionActive ? 1.2 : 1.0;
    let res0 = (maxDmg + ogeomMaxDmg) * potionFactor * (1 + (bfo / 100) * potionFactor);
    if (buffSangji) {
        res0 = res0 * (1 + 0.12 * potionFactor);
    }

    // 최종 방어력 (기본 방어력 + 최종 맥댐의 3% 자동 합산)
    const bonusDef = res0 * 0.03;
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
        `(기본 ${baseDef.toLocaleString()} + 맥댐 3% 보너스 ${Math.floor(bonusDef).toLocaleString()})`;
    document.getElementById("summary-final-hp").textContent = Math.floor(finalHp).toLocaleString();

    // 5. 베이스 스킬 데미지 연산
    // 윈드밀 데미지 공식 (구형 세트: 합산 +30% / 신형 세트: 곱산 *1.15)
    let baseWindmillMult = windmillRankVal + 0.03 * windmillReforge + (windmillErg / 100) + (windmillDarkErg / 100);
    if (setWindmillOld) {
        baseWindmillMult += 0.30;
    }
    if (setWindmillNew) {
        baseWindmillMult *= 1.15;
    }
    baseWindmillMult += (ogeomDmgWindmill / 100);

    // 돌진 데미지 공식 (세공 + 에르그 및 어둠의 에르그 합산 보정 + 마기그래프)
    let baseChargeMult = chargeRankMult + 0.1 * chargeReforge + (chargeErg / 100) + (chargeDarkErg / 100);
    if (buffMagigraffCharge) {
        baseChargeMult += 0.60;
    }
    baseChargeMult += (ogeomDmgCharge / 100);

    // 스매시 데미지 공식 (스매시 세공은 레벨당 +10%, 에르그 및 어둠의 에르그 합산 보정 + 마기그래프)
    let baseSmashMult = smashRankVal + 0.1 * smashReforge + (smashErg / 100) + (smashDarkErg / 100);
    if (buffMagigraffSmash) {
        baseSmashMult += 1.0;
    }
    baseSmashMult += (ogeomDmgSmash / 100);

    // 배쉬 데미지 공식 (배쉬 세공은 레벨당 +10%, 에르그 및 어둠의 에르그 합산 보정 + 마기그래프)
    let baseBashMult = bashSkillRankVal + 0.1 * bashSkillReforge + (bashSkillErg / 100) + (bashSkillDarkErg / 100);
    if (buffMagigraffBash) {
        baseBashMult += 0.40;
    }
    baseBashMult += (ogeomDmgBash / 100);

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
    if (buffGupkwan) {
        charPiercing += 1;
    }
    const netPiercing = Math.max(0, charPiercing - targetPiercingRes);

    // 디버프 적용 후 적의 보호 수치 (비율감소 → 고정감소 순서)
    const targetProtAfterDebuffs = Math.max(0, protAfterPercent - debuffProtFlat);

    // 1) 일반/표준 피어싱 (최대 9레벨 제한)
    const normalPiercingLevel = Math.min(9, netPiercing);
    const reducedProtNormal = Math.max(0, targetProtAfterDebuffs - getProtReduction(normalPiercingLevel));
    const reducedDefNormal = Math.max(0, targetDef - getDefReduction(normalPiercingLevel) - debuffDefFlat);

    // 보호에 따른 댐감율 공식: Y = 100/sqrt(2) * log10((x + 10*sqrt(2))/(10*sqrt(2))) / 100
    const sqrt2 = Math.sqrt(2);
    const getDmgRedFromProt = (prot) => {
        if (prot <= 0) return 0;
        let red = (100 / sqrt2) * Math.log10((prot + 10 * sqrt2) / (10 * sqrt2));
        red = Math.floor(red); // 소수점 버림
        return Math.min(0.9, Math.max(0.0, red / 100)); // 상한 90%, 하한 0% 적용
    };

    const normalProtMult = 1 - getDmgRedFromProt(reducedProtNormal);

    // 2) 아르카나 스킬 내 일반재능계수 적용 피어싱 (이중 피어싱적용, 최대 18레벨 제한)
    const doublePiercingLevel = Math.min(18, 2 * netPiercing);
    const reducedProtDouble = Math.max(0, targetProtAfterDebuffs - getProtReduction(doublePiercingLevel));
    const reducedDefDouble = Math.max(0, targetDef - getDefReduction(doublePiercingLevel) - debuffDefFlat);

    const doubleProtMult = 1 - getDmgRedFromProt(reducedProtDouble);

    // 보너스 대미지 배율 상세 정의 (DC인사이드 분석글 기반 카테고리 분리 곱연산)
    const equipBonusDmgMult = 1 + (weapon.bonusDmg + shieldBonusDmgApply) / 100; // 장비보댐효과

    // 정령 실체화 대미지 연산 (기본 10, 강화 시 25)
    let spiritTransformDmg = 0;
    if (buffSpiritTransform) {
        spiritTransformDmg = buffSpiritTransformEnhance ? 25 : 10;
    }

    // 쿤(Cwn Annwn) 디버프 적용 시 크리티컬 적중 시 보너스 대미지 +3%
    const bonusDmgCrit = bonusDmg + (debuffKun ? 3 : 0);

    // 재능 파트 일반보댐: 입력값 + 세바보댐 + 브레스 + 약점분석 + 정령실체화 모두 합산
    const sebaBonusDmg = buffSebaBonus ? (bfo * 0.1) : 0;
    const normalBonusDmgMult = 1 + (bonusDmg + sebaBonusDmg + ladecaBreathBonus + (buffWeaknessAnalysis ? 10 : 0) + spiritTransformDmg) / 100;
    // 아르카나 파트 일반보댐: 입력값 + 세바보댐 (브레스/약분/정령실체화 제외)
    const arcanaNormalBonusDmgMult = 1 + (bonusDmg + sebaBonusDmg) / 100;

    // 크리티컬 적중 시 재능 파트 및 아르카나 파트 보너스 대미지 최종 배율 (쿤 디버프 반영)
    const normalBonusDmgMultCrit = 1 + (bonusDmgCrit + sebaBonusDmg + ladecaBreathBonus + (buffWeaknessAnalysis ? 10 : 0) + spiritTransformDmg) / 100;
    const arcanaNormalBonusDmgMultCrit = 1 + (bonusDmgCrit + sebaBonusDmg) / 100;

    // 카드 breakdown용 레이블 (구성 항목 나열)
    const normalBonusDmgParts = [
        bonusDmg > 0 ? `입력 ${bonusDmg}%` : null,
        sebaBonusDmg > 0 ? `세바보댐 ${sebaBonusDmg.toFixed(1)}%` : null,
        ladecaBreathBonus > 0 ? `브레스 ${ladecaBreathBonus}%` : null,
        buffWeaknessAnalysis ? `약분 10%` : null,
        spiritTransformDmg > 0 ? `정령실체화 ${spiritTransformDmg}%` : null
    ].filter(Boolean);
    const normalBonusDmgLabel = normalBonusDmgParts.length > 0
        ? `[일반보댐: ${normalBonusDmgParts.join(' + ')}]`
        : `[일반보댐]`;
    // 아르카나 파트 레이블: 입력값 + 세바보댐
    const arcanaNormalBonusDmgParts = [
        bonusDmg > 0 ? `입력 ${bonusDmg}%` : null,
        sebaBonusDmg > 0 ? `세바보댐 ${sebaBonusDmg.toFixed(1)}%` : null
    ].filter(Boolean);
    const arcanaNormalBonusDmgLabel = arcanaNormalBonusDmgParts.length > 0
        ? `[일반보댐: ${arcanaNormalBonusDmgParts.join(' + ')}]`
        : `[일반보댐]`;

    const arcanaBonusDmgMult = 1 + arcanaBonusDmg / 100; // 아르카나보댐효과

    // 일반 재능 스킬용 보너스 대미지 최종 배율 (equipBonusDmgMult * talentNormalBonusDmgMult)
    const talentBonusDmgMult = equipBonusDmgMult * normalBonusDmgMult;
    const talentBonusDmgMultCrit = equipBonusDmgMult * normalBonusDmgMultCrit;

    // 최종데미지 증댐 디버프 배율 (곱연산)
    const masterAbrasiveMult = buffMasterAbrasive ? 1.03 : 1.0;
    const leimMult = buffLeim ? (buffLeimMagigraff ? 1.18 : 1.15) : 1.0;
    const proPackMult = buffProPack ? 1.01 : 1.0;
    const deathmarkerMultiplier = 1 + deathmarkerValueTotal / 100;
    const gupkwanMult = buffGupkwan ? 1.15 : 1.0;
    const imenMult = debuffImen ? (debuffImenTotem ? 1.05 : 1.03) : 1.0;
    const finalDmgMultiplier = (debuffDeathmarker ? deathmarkerMultiplier : 1.0) * (debuffMomo ? 1.15 : 1.0) * masterAbrasiveMult * leimMult * proPackMult * gupkwanMult * imenMult;

    // 성찰의 흔적 데미지 증가배율 (희생의 응징 유물 레벨당 *0.5% 증가, 기본 10%)
    const reflectionTracePct = 10 + relicRetribution * 0.5;
    const reflectionTraceMult = buffReflectionTrace ? (1 + reflectionTracePct / 100) : 1.0;

    // 크리티컬 배율 공통 정의
    const critMult = 2.5 + (addCrit / 100);

    // 윈드밀 스킬 데미지 (보너스 대미지 곱연산 이전)
    const rawWindmillDmg = res0 *
        baseWindmillMult *
        (1 + bashVal) *
        ladecaMult;

    const windmillDmg = Math.max(1, Math.floor(Math.max(0, rawWindmillDmg * talentBonusDmgMult * normalProtMult - reducedDefNormal) * finalDmgMultiplier));
    const windmillCrit = Math.max(1, Math.floor(Math.max(0, rawWindmillDmg * talentBonusDmgMultCrit * normalProtMult - reducedDefNormal) * finalDmgMultiplier * critMult));

    // 돌진 스킬 데미지 (보너스 대미지 곱연산 이전)
    const rawChargeDmg = res0 *
        baseChargeMult *
        (1 + bashVal) *
        ladecaMult;

    const chargeDmg = Math.max(1, Math.floor(Math.max(0, rawChargeDmg * talentBonusDmgMult * normalProtMult - reducedDefNormal) * finalDmgMultiplier));
    const chargeCrit = Math.max(1, Math.floor(Math.max(0, rawChargeDmg * talentBonusDmgMultCrit * normalProtMult - reducedDefNormal) * finalDmgMultiplier * critMult));

    // 스매시 스킬 데미지 (보너스 대미지 곱연산 이전)
    // 무기/아이템 증가 % 적용: 양손무기보너스(1+weaponTwoHandedSmashBonus) * 무기스매시보너스(1+weaponSmashBonus)
    const rawSmashDmg = res0 *
        baseSmashMult *
        (1 + weaponTwoHandedSmashBonus) *
        (1 + weaponSmashBonus) *
        (1 + (setSmash ? 0.15 : 0)) *
        (1 + bashVal) *
        ladecaMult;

    const smashDmg = Math.max(1, Math.floor(Math.max(0, rawSmashDmg * talentBonusDmgMult * normalProtMult - reducedDefNormal) * finalDmgMultiplier));
    const smashCrit = Math.max(1, Math.floor(Math.max(0, rawSmashDmg * talentBonusDmgMultCrit * normalProtMult - reducedDefNormal) * finalDmgMultiplier * critMult));

    // 배쉬 스킬 데미지 (보너스 대미지 곱연산 이전)
    // 무기 배쉬보너스 적용: (1 + weaponBashBonus)
    const rawBashSkillDmg = res0 *
        baseBashMult *
        (1 + weaponBashBonus) *
        ladecaMult;

    const bashSkillDmg = Math.max(1, Math.floor(Math.max(0, rawBashSkillDmg * talentBonusDmgMult * normalProtMult - reducedDefNormal) * finalDmgMultiplier));
    const bashSkillCrit = Math.max(1, Math.floor(Math.max(0, rawBashSkillDmg * talentBonusDmgMultCrit * normalProtMult - reducedDefNormal) * finalDmgMultiplier * critMult));

    // 6. 세이크리드 가드 5대 스킬 데미지 연산 (아르카나 곱연산보댐 공식 적용)
    // 오검 조합 효과 변수 정의
    const ironwallWindmillFactor = 1.5 + (ogeomSynergy === "fortress" ? (0.05 + 0.05 * (ogeomSynergyScore - 5)) : 0);
    const ironwallArcanaMaxDmgCoeff = 12.0 + (ogeomSynergy === "fortress" ? (2.0 + 1.0 * (ogeomSynergyScore - 5)) : 0) + (ogeomDmgIronwall / 100);
    const ironwallArcanaDefCoeff = 6.0 + (ogeomSynergy === "fortress" ? 3.0 : 0);
    const ironwallArcanaHpCoeff = 1.0 + (ogeomSynergy === "fortress" ? 0.5 : 0);

    const condemnationSynergyMult = (ogeomSynergy === "execution") ? (1.1 + 0.1 * (ogeomSynergyScore - 5)) : 1.0;
    const condemnationBaseMaxDmg = 15.0 * condemnationSynergyMult;
    const condemnationBaseDef = 9.0 * condemnationSynergyMult;
    const condemnationBaseHp = 1.5 * condemnationSynergyMult;

    // [1] 성역 전개: (링크보너스 최종데미지 100% 증가 즉 2.0배 곱)
    const rawSanctuary = res0 * (3.0 + (ogeomDmgSanctuary / 100)) + finalDef * 1.5 + finalHp * 0.2;
    const sanctuaryNormal = Math.max(1, Math.floor(Math.max(0, (rawSanctuary * normalProtMult * arcanaNormalBonusDmgMult) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * 2.0 * finalDmgMultiplier * reflectionTraceMult));
    const sanctuaryCrit = Math.max(1, Math.floor(Math.max(0, (rawSanctuary * normalProtMult * arcanaNormalBonusDmgMultCrit) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * 2.0 * finalDmgMultiplier * reflectionTraceMult * critMult));

    // [2] 철벽 강타:
    const rawIronwallArcana = res0 * ironwallArcanaMaxDmgCoeff + finalDef * ironwallArcanaDefCoeff + finalHp * ironwallArcanaHpCoeff;
    const ironwallNormal = Math.max(1, Math.floor(Math.max(0, ((rawWindmillDmg * ironwallWindmillFactor) * normalBonusDmgMult * doubleProtMult + rawIronwallArcana * normalProtMult * arcanaNormalBonusDmgMult) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * finalDmgMultiplier * reflectionTraceMult));
    const ironwallCrit = Math.max(1, Math.floor(Math.max(0, ((rawWindmillDmg * ironwallWindmillFactor) * normalBonusDmgMultCrit * doubleProtMult + rawIronwallArcana * normalProtMult * arcanaNormalBonusDmgMultCrit) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * finalDmgMultiplier * reflectionTraceMult * critMult));

    // [2.5] 단죄의 일격 단계 보정
    const condFactor3 = 2.0 + 2 * (ogeomDmgCondemnation / 100);
    const condFactor1 = (ogeomSynergy === "execution") ? condFactor3 : 1.0;
    const condFactor2 = (ogeomSynergy === "execution") ? condFactor3 : (1.5 + (ogeomDmgCondemnation / 100));

    // [2.5] 단죄의 일격 1단계:
    const rawCondemnation1Arcana = res0 * (condemnationBaseMaxDmg * condFactor1) + finalDef * (condemnationBaseDef * condFactor1) + finalHp * (condemnationBaseHp * condFactor1);
    const condemnation1Normal = Math.max(1, Math.floor(Math.max(0, ((rawWindmillDmg * 1.75) * normalBonusDmgMult * doubleProtMult + rawCondemnation1Arcana * normalProtMult * arcanaNormalBonusDmgMult) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * finalDmgMultiplier * reflectionTraceMult));
    const condemnation1Crit = Math.max(1, Math.floor(Math.max(0, ((rawWindmillDmg * 1.75) * normalBonusDmgMultCrit * doubleProtMult + rawCondemnation1Arcana * normalProtMult * arcanaNormalBonusDmgMultCrit) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * finalDmgMultiplier * reflectionTraceMult * critMult));

    // [2.6] 단죄의 일격 2단계:
    const rawCondemnation2Arcana = res0 * (condemnationBaseMaxDmg * condFactor2) + finalDef * (condemnationBaseDef * condFactor2) + finalHp * (condemnationBaseHp * condFactor2);
    const condemnation2Normal = Math.max(1, Math.floor(Math.max(0, ((rawWindmillDmg * 1.75) * normalBonusDmgMult * doubleProtMult + rawCondemnation2Arcana * normalProtMult * arcanaNormalBonusDmgMult) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * finalDmgMultiplier * reflectionTraceMult));
    const condemnation2Crit = Math.max(1, Math.floor(Math.max(0, ((rawWindmillDmg * 1.75) * normalBonusDmgMultCrit * doubleProtMult + rawCondemnation2Arcana * normalProtMult * arcanaNormalBonusDmgMultCrit) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * finalDmgMultiplier * reflectionTraceMult * critMult));

    // [2.7] 단죄의 일격 3단계:
    const rawCondemnation3Arcana = res0 * (condemnationBaseMaxDmg * condFactor3) + finalDef * (condemnationBaseDef * condFactor3) + finalHp * (condemnationBaseHp * condFactor3);
    const condemnation3Normal = Math.max(1, Math.floor(Math.max(0, ((rawWindmillDmg * 1.75) * normalBonusDmgMult * doubleProtMult + rawCondemnation3Arcana * normalProtMult * arcanaNormalBonusDmgMult) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * finalDmgMultiplier * reflectionTraceMult));
    const condemnation3Crit = Math.max(1, Math.floor(Math.max(0, ((rawWindmillDmg * 1.75) * normalBonusDmgMultCrit * doubleProtMult + rawCondemnation3Arcana * normalProtMult * arcanaNormalBonusDmgMultCrit) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * finalDmgMultiplier * reflectionTraceMult * critMult));

    // [3] 심판의 일격: (링크보너스 최종데미지 20% 증가 즉 1.2배 곱, 심판 유물레벨당 맥댐계수 +100% 합산)
    const rawJudgmentArcana = res0 * (35.0 + relicJudgment * 1.0 + (ogeomDmgJudgment / 100)) + finalDef * 20.0 + finalHp * 5.0;
    const judgmentNormal = Math.max(1, Math.floor(Math.max(0, ((rawWindmillDmg * 2.0) * normalBonusDmgMult * doubleProtMult + rawJudgmentArcana * normalProtMult * arcanaNormalBonusDmgMult) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * 1.2 * finalDmgMultiplier * reflectionTraceMult));
    const judgmentCrit = Math.max(1, Math.floor(Math.max(0, ((rawWindmillDmg * 2.0) * normalBonusDmgMultCrit * doubleProtMult + rawJudgmentArcana * normalProtMult * arcanaNormalBonusDmgMultCrit) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * 1.2 * finalDmgMultiplier * reflectionTraceMult * critMult));

    // [4] 격돌:
    const rawClashArcana = res0 * (8.0 + (ogeomDmgClash / 100)) + finalDef * 6.0 + finalHp * 0.5;
    const clashNormal = Math.max(1, Math.floor(Math.max(0, ((rawChargeDmg * 1.5) * normalBonusDmgMult * doubleProtMult + rawClashArcana * normalProtMult * arcanaNormalBonusDmgMult) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * finalDmgMultiplier * reflectionTraceMult));
    const clashCrit = Math.max(1, Math.floor(Math.max(0, ((rawChargeDmg * 1.5) * normalBonusDmgMultCrit * doubleProtMult + rawClashArcana * normalProtMult * arcanaNormalBonusDmgMultCrit) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * finalDmgMultiplier * reflectionTraceMult * critMult));

    // [5] 희생의 응징: (링크보너스 최종데미지 15% 증가 즉 1.15배 곱, 성찰의 흔적 버프 기본 적용)
    const retributionReflectionMult = 1 + (10 + relicRetribution * 0.5) / 100;
    const rawRetributionArcana = (res0 * (60.0 + (ogeomDmgRetribution / 100)) + finalDef * 40.0 + finalHp * 15.0) * (1 + shield.drr / 100);
    const retributionNormal = Math.max(1, Math.floor(Math.max(0, (rawRetributionArcana * normalProtMult * arcanaNormalBonusDmgMult) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * 1.15 * finalDmgMultiplier * retributionReflectionMult));
    const retributionCrit = Math.max(1, Math.floor(Math.max(0, (rawRetributionArcana * normalProtMult * arcanaNormalBonusDmgMultCrit) * equipBonusDmgMult * arcanaBonusDmgMult - reducedDefNormal) * 1.15 * finalDmgMultiplier * retributionReflectionMult * critMult));

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
        "windmill": { normal: windmillDmg, crit: windmillCrit },
        "charge": { normal: chargeDmg, crit: chargeCrit },
        "smash": { normal: smashDmg, crit: smashCrit },
        "bash": { normal: bashSkillDmg, crit: bashSkillCrit }
    };

    // 소수점 버림 및 최소 대미지 1 적용 (하한선)
    Object.keys(results).forEach(key => {
        results[key].normal = Math.max(1, Math.floor(results[key].normal));
        results[key].crit = Math.max(1, Math.floor(results[key].crit));
    });

    Object.keys(results).forEach(key => {
        const normEl = document.getElementById(`dmg-${key}-normal`);
        const critEl = document.getElementById(`dmg-${key}-crit`);
        if (normEl) normEl.textContent = results[key].normal.toLocaleString();
        if (critEl) critEl.textContent = results[key].crit.toLocaleString();
    });

    // 광휘의 단죄 조합(집행) 활성화 시 1단계 및 2단계 카드 숨김 처리
    // 단, 빌드 비교가 활성화된 상태(activeCompareBuildId가 존재하는 경우)에는 비교를 위해 1, 2단계를 모두 노출
    const cardCond1 = document.querySelector('[data-skill="condemnation1"]');
    const cardCond2 = document.querySelector('[data-skill="condemnation2"]');
    if (cardCond1 && cardCond2) {
        if (ogeomSynergy === "execution" && !activeCompareBuildId) {
            cardCond1.style.display = "none";
            cardCond2.style.display = "none";
        } else {
            cardCond1.style.display = "";
            cardCond2.style.display = "";
        }
    }

    // 8. 데미지 공식 상세 분해 렌더링
    const formatArcanaMath = (rawTalent, talentFormula, talentMult, doubleProt, rawArcana, arcanaFormula, arcanaDmgMult, normalProt, equipMult, normalDef, finalVal, linkBonus = 1.0, reflectionMult = 1.0, relicRetLevel = 0) => {
        const talentPartBase = rawTalent; // (약점분석/브레스는 normalBonusDmgMult에 합산됨)
        const talentPartDmg = Math.floor(talentPartBase * talentMult * doubleProt);
        const arcanaPartDmg = Math.floor(rawArcana * normalProt * arcanaNormalBonusDmgMult);
        const baseFinalDmg = Math.max(0, (talentPartDmg + arcanaPartDmg) * equipMult * arcanaDmgMult - Math.floor(normalDef));
        let step3Text = `- 기본 최종 데미지 = [ ${talentPartDmg.toLocaleString()} (재능) + ${arcanaPartDmg.toLocaleString()} (아르카나) ] &times; ${f(equipMult)} [장비보댐] &times; ${f(arcanaDmgMult)} [아르카나보댐] - ${Math.floor(normalDef)} [적방어] = <strong>${Math.floor(baseFinalDmg).toLocaleString()}</strong>`;

        let mults = [];
        if (linkBonus !== 1.0) {
            const label = (linkBonus === condemnationSynergyMult) ? "오검 조합" : "링크 보너스";
            mults.push(`${f(linkBonus, 2)} [${label}]`);
        }
        if (reflectionMult !== 1.0) {
            const pct = 10 + relicRetLevel * 0.5;
            mults.push(`${f(reflectionMult, 3)} [성찰의 흔적 (+${f(pct, 1)}%)]`);
        }
        if (debuffDeathmarker) {
            mults.push(`${f(deathmarkerMultiplier)} [데스 마커]`);
        }
        if (debuffMomo) {
            mults.push(`1.15 [모모]`);
        }
        if (buffMasterAbrasive) {
            mults.push(`1.03 [명장의 연마재]`);
        }
        if (buffLeim) {
            mults.push(`${leimMult.toFixed(2)} [레임${buffLeimMagigraff ? ' (마기그래프)' : ''}]`);
        }
        if (buffProPack) {
            mults.push(`1.01 [프플팩]`);
        }
        if (buffGupkwan) {
            mults.push(`1.15 [급소 관통]`);
        }
        if (debuffImen) {
            mults.push(`${debuffImenTotem ? '1.05' : '1.03'} [이면${debuffImenTotem ? ' (토템)' : ''}]`);
        }

        if (mults.length > 0) {
            step3Text += `<br>- 최종 데미지 = ${Math.floor(baseFinalDmg).toLocaleString()} &times; ${mults.join(' &times; ')} = <strong>${Math.floor(finalVal).toLocaleString()}</strong>`;
        }

        return `
            <div class="math-step">
                <span class="math-step-num">1단계 계산</span>
                <span class="math-step-text">
                    - <strong>재능 파트:</strong> ${talentFormula} = <strong>${Math.floor(talentPartBase).toLocaleString()}</strong> 데미지<br>
                    - <strong>아르카나 파트:</strong> ${arcanaFormula} = <strong>${Math.floor(rawArcana).toLocaleString()}</strong> 데미지
                </span>
            </div>
            <div class="math-step">
                <span class="math-step-num">2단계 피어싱 보댐 적용</span>
                <span class="math-step-text">
                    - 재능 파트: ${Math.floor(talentPartBase).toLocaleString()} &times; ${f(talentMult)} ${normalBonusDmgLabel} &times; ${f(doubleProt)} [이중피어싱 댐감율] = <strong>${talentPartDmg.toLocaleString()}</strong><br>
                    - 아르카나 파트: ${Math.floor(rawArcana).toLocaleString()} &times; ${f(normalProt)} [기본피어싱 댐감율]${arcanaNormalBonusDmgMult !== 1.0 ? ` &times; ${f(arcanaNormalBonusDmgMult)} ${arcanaNormalBonusDmgLabel}` : ''} = <strong>${arcanaPartDmg.toLocaleString()}</strong>
                </span>
            </div>
            <div class="math-step">
                <span class="math-step-num">3단계 최종 합산</span>
                <span class="math-step-text">
                    ${step3Text}
                </span>
            </div>
            <div class="math-final">
                결과 = <strong>${Math.floor(finalVal).toLocaleString()}</strong>
            </div>
        `;
    };

    const formatArcanaOnlyMath = (rawArcana, arcanaFormula, arcanaDmgMult, normalProt, equipMult, normalDef, finalVal, linkBonus = 1.0, reflectionMult = 1.0, relicRetLevel = 0) => {
        const arcanaPartDmg = Math.floor(rawArcana * normalProt * arcanaNormalBonusDmgMult);
        const baseFinalDmg = Math.max(0, arcanaPartDmg * equipMult * arcanaDmgMult - Math.floor(normalDef));

        let step3Text = `- 기본 최종 데미지 = ${arcanaPartDmg.toLocaleString()} &times; ${f(equipMult)} [장비보댐] &times; ${f(arcanaDmgMult)} [아르카나보댐] - ${Math.floor(normalDef)} [적방어] = <strong>${Math.floor(baseFinalDmg).toLocaleString()}</strong>`;

        let mults = [];
        if (linkBonus !== 1.0) {
            mults.push(`${f(linkBonus, 2)} [링크 보너스]`);
        }
        if (reflectionMult !== 1.0) {
            const pct = 10 + relicRetLevel * 0.5;
            mults.push(`${f(reflectionMult, 3)} [성찰의 흔적 (+${f(pct, 1)}%)]`);
        }
        if (debuffDeathmarker) {
            mults.push(`${f(deathmarkerMultiplier)} [데스 마커]`);
        }
        if (debuffMomo) {
            mults.push(`1.15 [모모]`);
        }
        if (buffMasterAbrasive) {
            mults.push(`1.03 [명장의 연마재]`);
        }
        if (buffLeim) {
            mults.push(`${leimMult.toFixed(2)} [레임${buffLeimMagigraff ? ' (마기그래프)' : ''}]`);
        }
        if (buffProPack) {
            mults.push(`1.01 [프플팩]`);
        }
        if (buffGupkwan) {
            mults.push(`1.15 [급소 관통]`);
        }
        if (debuffImen) {
            mults.push(`${debuffImenTotem ? '1.05' : '1.03'} [이면${debuffImenTotem ? ' (토템)' : ''}]`);
        }

        if (mults.length > 0) {
            step3Text += `<br>- 최종 데미지 = ${Math.floor(baseFinalDmg).toLocaleString()} &times; ${mults.join(' &times; ')} = <strong>${Math.floor(finalVal).toLocaleString()}</strong>`;
        }

        return `
            <div class="math-step">
                <span class="math-step-num">1단계 계산</span>
                <span class="math-step-text">
                    - <strong>아르카나 파트:</strong> ${arcanaFormula} = <strong>${Math.floor(rawArcana).toLocaleString()}</strong> 데미지
                </span>
            </div>
            <div class="math-step">
                <span class="math-step-num">2단계 피어싱 보댐 적용</span>
                <span class="math-step-text">
                    - 아르카나 파트: ${Math.floor(rawArcana).toLocaleString()} &times; ${f(normalProt)} [기본피어싱 댐감율]${arcanaNormalBonusDmgMult !== 1.0 ? ` &times; ${f(arcanaNormalBonusDmgMult)} ${arcanaNormalBonusDmgLabel}` : ''} = <strong>${arcanaPartDmg.toLocaleString()}</strong>
                </span>
            </div>
            <div class="math-step">
                <span class="math-step-num">3단계 최종 합산</span>
                <span class="math-step-text">
                    ${step3Text}
                </span>
            </div>
            <div class="math-final">
                결과 = <strong>${Math.floor(finalVal).toLocaleString()}</strong>
            </div>
        `;
    };

    const formatTalentMath = (rawTalent, talentFormula, talentMult, normalProt, normalDef, finalVal) => {
        const talentPartBase = rawTalent; // (약점분석/브레스는 normalBonusDmgMult에 합산됨)
        const baseFinalDmg = Math.max(0, talentPartBase * talentMult * normalProt - Math.floor(normalDef));

        let step2Text = `- 기본 최종 데미지 = ${Math.floor(talentPartBase).toLocaleString()} &times; ${f(talentMult)} ${normalBonusDmgLabel} &times; ${f(normalProt)} [기본피어싱 댐감율] - ${Math.floor(normalDef)} [적방어] = <strong>${Math.floor(baseFinalDmg).toLocaleString()}</strong>`;

        let mults = [];
        if (debuffDeathmarker) {
            mults.push(`${f(deathmarkerMultiplier)} [데스 마커]`);
        }
        if (debuffMomo) {
            mults.push(`1.15 [모모]`);
        }
        if (buffMasterAbrasive) {
            mults.push(`1.03 [명장의 연마재]`);
        }
        if (buffLeim) {
            mults.push(`${leimMult.toFixed(2)} [레임${buffLeimMagigraff ? ' (마기그래프)' : ''}]`);
        }
        if (buffProPack) {
            mults.push(`1.01 [프플팩]`);
        }
        if (buffGupkwan) {
            mults.push(`1.15 [급소 관통]`);
        }
        if (debuffImen) {
            mults.push(`${debuffImenTotem ? '1.05' : '1.03'} [이면${debuffImenTotem ? ' (토템)' : ''}]`);
        }

        if (mults.length > 0) {
            step2Text += `<br>- 최종 데미지 = ${Math.floor(baseFinalDmg).toLocaleString()} &times; ${mults.join(' &times; ')} = <strong>${Math.floor(finalVal).toLocaleString()}</strong>`;
        }

        return `
            <div class="math-step">
                <span class="math-step-num">1단계 계산</span>
                <span class="math-step-text">
                    - <strong>재능 파트:</strong> ${talentFormula} = <strong>${Math.floor(talentPartBase).toLocaleString()}</strong> 데미지
                </span>
            </div>
            <div class="math-step">
                <span class="math-step-num">2단계 피어싱 보댐 적용</span>
                <span class="math-step-text">
                    ${step2Text}
                </span>
            </div>
            <div class="math-final">
                결과 = <strong>${Math.floor(finalVal).toLocaleString()}</strong>
            </div>
        `;
    };

    // 각 스킬별 베이스데미지 수식 정의
    const sanctuaryFormula = `( [최종맥댐] ${Math.floor(res0).toLocaleString()} &times; ${f(3.0 + ogeomDmgSanctuary / 100, 2)} + [최종방어] ${Math.floor(finalDef).toLocaleString()} &times; 1.5 + [최종체력] ${Math.floor(finalHp).toLocaleString()} &times; 0.2 )`;

    const ironwallTalentFormula = `[최종맥댐] ${Math.floor(res0).toLocaleString()} &times; ${f(baseWindmillMult)} [윈밀계수] &times; ${f(1 + bashVal, 2)} [배쉬] &times; ${f(ladecaMult, 2)} [라데카] &times; ${f(ironwallWindmillFactor, 2)} [철벽배율]`;
    const ironwallArcanaFormula = `[최종맥댐] ${Math.floor(res0).toLocaleString()} &times; ${f(ironwallArcanaMaxDmgCoeff, 2)} + [최종방어] ${Math.floor(finalDef).toLocaleString()} &times; ${f(ironwallArcanaDefCoeff, 2)} + [최종체력] ${Math.floor(finalHp).toLocaleString()} &times; ${f(ironwallArcanaHpCoeff, 2)}`;

    const condemnation1TalentFormula = `[최종맥댐] ${Math.floor(res0).toLocaleString()} &times; ${f(baseWindmillMult)} [윈밀계수] &times; ${f(1 + bashVal, 2)} [배쉬] &times; ${f(ladecaMult, 2)} [라데카] &times; 1.75 [단죄배율]`;
    const condSynText = condemnationSynergyMult !== 1.0 ? ` &times; ${f(condemnationSynergyMult, 2)} [오검 조합]` : "";
    const condemnation1ArcanaFormula = `( [최종맥댐] ${Math.floor(res0).toLocaleString()} &times; 15 &times; ${f(condFactor1, 2)} [단죄 단계별 배수]${condSynText} ) + ( [최종방어] ${Math.floor(finalDef).toLocaleString()} &times; 9 &times; ${f(condFactor1, 2)} [단죄 단계별 배수]${condSynText} ) + ( [최종체력] ${Math.floor(finalHp).toLocaleString()} &times; 1.5 &times; ${f(condFactor1, 2)} [단죄 단계별 배수]${condSynText} )`;

    const condemnation2TalentFormula = condemnation1TalentFormula;
    const condemnation2ArcanaFormula = `( [최종맥댐] ${Math.floor(res0).toLocaleString()} &times; 15 &times; ${f(condFactor2, 2)} [단죄 단계별 배수]${condSynText} ) + ( [최종방어] ${Math.floor(finalDef).toLocaleString()} &times; 9 &times; ${f(condFactor2, 2)} [단죄 단계별 배수]${condSynText} ) + ( [최종체력] ${Math.floor(finalHp).toLocaleString()} &times; 1.5 &times; ${f(condFactor2, 2)} [단죄 단계별 배수]${condSynText} )`;

    const condemnation3TalentFormula = condemnation1TalentFormula;
    const condemnation3ArcanaFormula = `( [최종맥댐] ${Math.floor(res0).toLocaleString()} &times; 15 &times; ${f(condFactor3, 2)} [단죄 단계별 배수]${condSynText} ) + ( [최종방어] ${Math.floor(finalDef).toLocaleString()} &times; 9 &times; ${f(condFactor3, 2)} [단죄 단계별 배수]${condSynText} ) + ( [최종체력] ${Math.floor(finalHp).toLocaleString()} &times; 1.5 &times; ${f(condFactor3, 2)} [단죄 단계별 배수]${condSynText} )`;

    const judgmentTalentFormula = `[최종맥댐] ${Math.floor(res0).toLocaleString()} &times; ${f(baseWindmillMult)} [윈밀계수] &times; ${f(1 + bashVal, 2)} [배쉬] &times; ${f(ladecaMult, 2)} [라데카] &times; 2.0 [심판배율]`;
    const judgmentArcanaFormula = `[최종맥댐] ${Math.floor(res0).toLocaleString()} &times; ${f(35.0 + relicJudgment * 1.0 + ogeomDmgJudgment / 100, 1)} + [최종방어] ${Math.floor(finalDef).toLocaleString()} &times; 20.0 + [최종체력] ${Math.floor(finalHp).toLocaleString()} &times; 5.0`;

    const clashTalentFormula = `[최종맥댐] ${Math.floor(res0).toLocaleString()} &times; ${f(baseChargeMult)} [돌진계수] &times; ${f(1 + bashVal, 2)} [배쉬] &times; ${f(ladecaMult, 2)} [라데카] &times; 1.5 [격돌배율]`;
    const clashArcanaFormula = `[최종맥댐] ${Math.floor(res0).toLocaleString()} &times; ${f(8.0 + ogeomDmgClash / 100, 2)} + [최종방어] ${Math.floor(finalDef).toLocaleString()} &times; 6.0 + [최종체력] ${Math.floor(finalHp).toLocaleString()} &times; 0.5`;

    const retributionFormula = `( [최종맥댐] ${Math.floor(res0).toLocaleString()} &times; ${f(60.0 + ogeomDmgRetribution / 100, 2)} + [최종방어] ${Math.floor(finalDef).toLocaleString()} &times; 40.0 + [최종체력] ${Math.floor(finalHp).toLocaleString()} &times; 15.0 ) &times; ${f(1 + shield.drr / 100, 2)} [방패감소율]`;

    const smashFormula = `[최종맥댐] ${Math.floor(res0).toLocaleString()} &times; ${f(baseSmashMult)} [스매시배율] &times; ${f(1 + weaponTwoHandedSmashBonus, 2)} [양손보너스] &times; ${f(1 + weaponSmashBonus, 2)} [아이템 보너스] &times;  ${f(1 + (setSmash ? 0.15 : 0), 2)} [스매강] &times; ${f(1 + bashVal, 2)} [배쉬] &times; ${f(ladecaMult, 2)} [라데카]`;

    const bashFormula = `[최종맥댐] ${Math.floor(res0).toLocaleString()} &times; ${f(baseBashMult)} [배쉬배율] &times; ${f(1 + weaponBashBonus, 2)} [아이템 보너스] &times; ${f(ladecaMult, 2)} [라데카]`;


    const windmillFormula = `[최종맥댐] ${Math.floor(res0).toLocaleString()} &times; ${f(baseWindmillMult)} [윈밀배율] &times; ${f(1 + bashVal, 2)} [배쉬] &times; ${f(ladecaMult, 2)} [라데카]`;
    const chargeFormula = `[최종맥댐] ${Math.floor(res0).toLocaleString()} &times; ${f(baseChargeMult)} [돌진배율] &times; ${f(1 + bashVal, 2)} [배쉬] &times; ${f(ladecaMult, 2)} [라데카]`;

    document.getElementById("card-math-sanctuary").innerHTML =
        formatArcanaOnlyMath(rawSanctuary, sanctuaryFormula, arcanaBonusDmgMult, normalProtMult, equipBonusDmgMult, reducedDefNormal, sanctuaryNormal, 2.0, reflectionTraceMult, relicRetribution);

    document.getElementById("card-math-ironwall").innerHTML =
        formatArcanaMath(rawWindmillDmg * 1.5, ironwallTalentFormula, normalBonusDmgMult, doubleProtMult, rawIronwallArcana, ironwallArcanaFormula, arcanaBonusDmgMult, normalProtMult, equipBonusDmgMult, reducedDefNormal, ironwallNormal, 1.0, reflectionTraceMult, relicRetribution);

    document.getElementById("card-math-condemnation1").innerHTML =
        formatArcanaMath(rawWindmillDmg * 1.75, condemnation1TalentFormula, normalBonusDmgMult, doubleProtMult, rawCondemnation1Arcana, condemnation1ArcanaFormula, arcanaBonusDmgMult, normalProtMult, equipBonusDmgMult, reducedDefNormal, condemnation1Normal, 1.0, reflectionTraceMult, relicRetribution);

    document.getElementById("card-math-condemnation2").innerHTML =
        formatArcanaMath(rawWindmillDmg * 1.75, condemnation2TalentFormula, normalBonusDmgMult, doubleProtMult, rawCondemnation2Arcana, condemnation2ArcanaFormula, arcanaBonusDmgMult, normalProtMult, equipBonusDmgMult, reducedDefNormal, condemnation2Normal, 1.0, reflectionTraceMult, relicRetribution);

    document.getElementById("card-math-condemnation3").innerHTML =
        formatArcanaMath(rawWindmillDmg * 1.75, condemnation3TalentFormula, normalBonusDmgMult, doubleProtMult, rawCondemnation3Arcana, condemnation3ArcanaFormula, arcanaBonusDmgMult, normalProtMult, equipBonusDmgMult, reducedDefNormal, condemnation3Normal, 1.0, reflectionTraceMult, relicRetribution);

    document.getElementById("card-math-judgment").innerHTML =
        formatArcanaMath(rawWindmillDmg * 2.0, judgmentTalentFormula, normalBonusDmgMult, doubleProtMult, rawJudgmentArcana, judgmentArcanaFormula, arcanaBonusDmgMult, normalProtMult, equipBonusDmgMult, reducedDefNormal, judgmentNormal, 1.2, reflectionTraceMult, relicRetribution);

    document.getElementById("card-math-clash").innerHTML =
        formatArcanaMath(rawChargeDmg * 1.5, clashTalentFormula, normalBonusDmgMult, doubleProtMult, rawClashArcana, clashArcanaFormula, arcanaBonusDmgMult, normalProtMult, equipBonusDmgMult, reducedDefNormal, clashNormal, 1.0, reflectionTraceMult, relicRetribution);

    document.getElementById("card-math-retribution").innerHTML =
        formatArcanaOnlyMath(rawRetributionArcana, retributionFormula, arcanaBonusDmgMult, normalProtMult, equipBonusDmgMult, reducedDefNormal, retributionNormal, 1.15, retributionReflectionMult, relicRetribution);

    document.getElementById("card-math-windmill").innerHTML =
        formatTalentMath(rawWindmillDmg, windmillFormula, talentBonusDmgMult, normalProtMult, reducedDefNormal, windmillDmg);

    document.getElementById("card-math-charge").innerHTML =
        formatTalentMath(rawChargeDmg, chargeFormula, talentBonusDmgMult, normalProtMult, reducedDefNormal, chargeDmg);

    document.getElementById("card-math-smash").innerHTML =
        formatTalentMath(rawSmashDmg, smashFormula, talentBonusDmgMult, normalProtMult, reducedDefNormal, smashDmg);

    document.getElementById("card-math-bash").innerHTML =
        formatTalentMath(rawBashSkillDmg, bashFormula, talentBonusDmgMult, normalProtMult, reducedDefNormal, bashSkillDmg);

    // 8.5. 우측 데미지 리포트 카드 계수 텍스트 동적 업데이트
    document.getElementById("summary-sanctuary-coeff").textContent = `계수: 맥댐 ${f((3.0 + ogeomDmgSanctuary / 100) * 100, 1)}% + 방어 150% + 생명 20%`;
    document.getElementById("summary-ironwall-coeff").textContent = `계수: 윈드밀 ${f(ironwallWindmillFactor * 100, 1)}% + 맥댐 ${f(ironwallArcanaMaxDmgCoeff * 100, 1)}% + 방어 ${f(ironwallArcanaDefCoeff * 100, 1)}% + 생명 ${f(ironwallArcanaHpCoeff * 100, 1)}%`;
    document.getElementById("summary-condemnation1-coeff").textContent = `계수: 윈드밀 175% + 맥댐 ${f(condemnationBaseMaxDmg * condFactor1 * 100, 1)}% + 방어 ${f(condemnationBaseDef * condFactor1 * 100, 1)}% + 생명 ${f(condemnationBaseHp * condFactor1 * 100, 1)}%`;
    document.getElementById("summary-condemnation2-coeff").textContent = `계수: 윈드밀 175% + 맥댐 ${f(condemnationBaseMaxDmg * condFactor2 * 100, 1)}% + 방어 ${f(condemnationBaseDef * condFactor2 * 100, 1)}% + 생명 ${f(condemnationBaseHp * condFactor2 * 100, 1)}%`;
    document.getElementById("summary-condemnation3-coeff").textContent = `계수: 윈드밀 175% + 맥댐 ${f(condemnationBaseMaxDmg * condFactor3 * 100, 1)}% + 방어 ${f(condemnationBaseDef * condFactor3 * 100, 1)}% + 생명 ${f(condemnationBaseHp * condFactor3 * 100, 1)}%`;
    document.getElementById("summary-judgment-coeff").textContent = `계수: 윈드밀 200% + 맥댐 ${f((35.0 + relicJudgment * 1.0 + ogeomDmgJudgment / 100) * 100, 1)}% + 방어 2000% + 생명 500%`;
    document.getElementById("summary-clash-coeff").textContent = `계수: 돌진 150% + 맥댐 ${f((8.0 + ogeomDmgClash / 100) * 100, 1)}% + 방어 600% + 생명 50%`;
    document.getElementById("summary-retribution-coeff").textContent = `계수: (맥댐 ${f((60.0 + ogeomDmgRetribution / 100) * 100, 1)}% + 방어 4000% + 생명 1500%) * (1 + 방패감소율)`;
    document.getElementById("summary-windmill-coeff").textContent = `계수: 윈드밀 ${f(baseWindmillMult * 100, 1)}%`;
    document.getElementById("summary-charge-coeff").textContent = `계수: 돌진 ${f(baseChargeMult * 100, 1)}%`;
    document.getElementById("summary-smash-coeff").textContent = `계수: 스매시 ${f(baseSmashMult * (1 + weaponTwoHandedSmashBonus) * (1 + weaponSmashBonus) * (1 + (setSmash ? 0.15 : 0)) * 100, 1)}%`;
    document.getElementById("summary-bash-coeff").textContent = `계수: 배쉬 ${f(baseBashMult * (1 + weaponBashBonus) * 100, 1)}%`;

    if (isCalculatingBase) {
        // 기저 비교 빌드 계산 도중이면 무한 루프 방지를 위해 조기 리턴
        return;
    }

    // 9. 빌드 비교 렌더링 수행
    let baseBuildData = null;
    const activeBuild = savedBuilds.find(b => b.id === activeCompareBuildId);
    if (activeBuild) {
        isCalculatingBase = true;
        
        // 현재 화면 세팅 백업
        const backupInputs = getBuildInputs();
        
        // 비교 기준 빌드로 화면 세팅 임시 전환 (몬스터 타입 제외)
        restoreBuildInputs(activeBuild.inputs);
        
        // 동기식으로 다시 연산 수행하여 DOM에 기준 빌드 결과 출력
        calculate();
        
        // 기준 빌드 수치 읽어오기
        const getVal = (id) => Math.floor(parseFloat(document.getElementById(id).textContent.replace(/,/g, '')) || 0);
        baseBuildData = {
            meta: {
                maxDmg: getVal("summary-final-max-dmg"),
                finalDef: getVal("summary-final-defense"),
                finalHp: getVal("summary-final-hp")
            },
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
        
        // 원본 화면 세팅 복원
        restoreBuildInputs(backupInputs);
        
        // 원본 화면 기준 최종 연산 수행
        calculate();
        
        isCalculatingBase = false;
    }

    updateComparisonUI(results, { maxDmg: res0, finalDef: finalDef, finalHp: finalHp }, baseBuildData);
}

// 현재 입력값을 로컬 스토리지 빌드 스택에 저장
function saveCurrentBuild() {
    const buildName = document.getElementById("build-name-input").value.trim() || `빌드 #${savedBuilds.length + 1}`;
    const maxDmg = Math.floor(parseFloat(document.getElementById("summary-final-max-dmg").textContent.replace(/,/g, '')) || 0);
    const finalDef = Math.floor(parseFloat(document.getElementById("summary-final-defense").textContent.replace(/,/g, '')) || 0);
    const finalHp = Math.floor(parseFloat(document.getElementById("summary-final-hp").textContent.replace(/,/g, '')) || 0);

    const getVal = (id) => Math.floor(parseFloat(document.getElementById(id).textContent.replace(/,/g, '')) || 0);

    const newBuild = {
        id: 'build_' + Date.now(),
        name: buildName,
        meta: {
            maxDmg,
            finalDef,
            finalHp,
            timestamp: new Date().toLocaleString("ko-KR", { hour12: false })
        },
        inputs: getBuildInputs(),
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

    savedBuilds.push(newBuild);
    localStorage.setItem("sacred_guard_saved_builds", JSON.stringify(savedBuilds));

    // 입력 필드 초기화
    document.getElementById("build-name-input").value = "";

    // 새로 저장한 빌드를 비교 기준 및 현재 적용 빌드로 자동 설정
    activeCompareBuildId = newBuild.id;
    activeLoadedBuildId = newBuild.id;
    localStorage.setItem("sacred_guard_active_compare_id", activeCompareBuildId);

    renderSavedBuildsList();
    calculate(); // 다시 계산하여 비교 수치 반영
}

// 빌드 비교 비활성화
function resetBuildComparison() {
    activeCompareBuildId = null;
    localStorage.removeItem("sacred_guard_active_compare_id");
    
    document.getElementById("btn-reset-build").classList.add("hidden");
    if (savedBuilds.length === 0) {
        document.getElementById("comparison-status-text").textContent = "저장된 빌드가 없습니다. 현재 세팅을 저장하거나 비교 기준을 선택하세요.";
    } else {
        document.getElementById("comparison-status-text").textContent = "비교 기준이 선택되지 않았습니다. 아래 목록에서 '비교기준'을 선택하세요.";
    }
    document.getElementById("comparison-sub-text").textContent = "";

    // 비교 배지 전부 숨김
    const badges = document.querySelectorAll(".compare-badge");
    badges.forEach(badge => {
        badge.classList.add("hidden");
    });

    renderSavedBuildsList();
}

// 현재 계산값과 저장된 빌드 값을 대조하여 증감율 렌더링
function updateComparisonUI(currentResults, currentStats, baseBuildData) {
    const activeBuild = savedBuilds.find(b => b.id === activeCompareBuildId);
    if (!activeBuild) {
        document.querySelectorAll(".compare-badge").forEach(badge => {
            badge.classList.add("hidden");
        });
        document.getElementById("btn-reset-build").classList.add("hidden");
        if (savedBuilds.length === 0) {
            document.getElementById("comparison-status-text").textContent = "저장된 빌드가 없습니다. 현재 세팅을 저장하거나 비교 기준을 선택하세요.";
        } else {
            document.getElementById("comparison-status-text").textContent = "비교 기준이 선택되지 않았습니다. 아래 목록에서 '비교기준'을 선택하세요.";
        }
        document.getElementById("comparison-sub-text").textContent = "";
        return;
    }

    const baseMeta = baseBuildData ? baseBuildData.meta : activeBuild.meta;
    const baseSkills = baseBuildData ? baseBuildData.skills : activeBuild.skills;

    document.getElementById("btn-reset-build").classList.remove("hidden");
    document.getElementById("comparison-status-text").textContent = `기준 빌드: ${activeBuild.name}`;
    document.getElementById("comparison-sub-text").textContent = `기준 스탯 - 맥댐: ${baseMeta.maxDmg.toLocaleString()}, 방어: ${baseMeta.finalDef.toLocaleString()}, 생명: ${baseMeta.finalHp.toLocaleString()}`;

    // 최종 보정 스탯 비교 반영
    if (currentStats) {
        const statsToCompare = [
            { id: "compare-stat-max-dmg", currentVal: currentStats.maxDmg, savedVal: baseMeta.maxDmg },
            { id: "compare-stat-defense", currentVal: currentStats.finalDef, savedVal: baseMeta.finalDef },
            { id: "compare-stat-hp", currentVal: currentStats.finalHp, savedVal: baseMeta.finalHp }
        ];

        statsToCompare.forEach(item => {
            const badge = document.getElementById(item.id);
            if (!badge) return;

            if (item.savedVal === undefined || item.savedVal === 0) {
                badge.classList.add("hidden");
                return;
            }

            const pct = ((item.currentVal - item.savedVal) / item.savedVal) * 100;

            if (Math.abs(pct) <= 0.05) {
                badge.classList.add("hidden");
                return;
            }

            badge.classList.remove("hidden", "positive", "negative");
            const direction = pct > 0 ? "▲" : "▼";
            const sign = pct > 0 ? "+" : "";
            badge.querySelector(".compare-val").textContent = `${sign}${pct.toFixed(1)}% ${direction}`;
            if (pct > 0.05) {
                badge.classList.add("positive");
            } else if (pct < -0.05) {
                badge.classList.add("negative");
            }
        });
    }

    Object.keys(currentResults).forEach(key => {
        const badge = document.getElementById(`compare-${key}`);
        if (!badge) return;

        const currentVal = currentResults[key].normal;
        const savedVal = baseSkills[key];

        if (savedVal === undefined || savedVal === 0) {
            badge.classList.add("hidden");
            return;
        }

        const pct = ((currentVal - savedVal) / savedVal) * 100;

        // 차이가 0.05% 이하인 경우(거의 동일 또는 동일) 배지를 표시하지 않아 시각적 소음 줄임
        if (Math.abs(pct) <= 0.05) {
            badge.classList.add("hidden");
            return;
        }

        badge.classList.remove("hidden", "positive", "negative");

        const direction = pct > 0 ? "▲" : "▼";
        const sign = pct > 0 ? "+" : "";
        badge.querySelector(".compare-val").textContent = `${direction} ${sign}${pct.toFixed(1)}%`;

        if (pct > 0.05) {
            badge.classList.add("positive");
        } else if (pct < -0.05) {
            badge.classList.add("negative");
        }
    });
}

// 입력 폼들의 설정 상태 수집
function getBuildInputs() {
    const inputsState = {};
    document.querySelectorAll("input[type='number']").forEach(el => {
        inputsState[el.id] = el.value;
    });
    document.querySelectorAll("input[type='checkbox']").forEach(el => {
        inputsState[el.id] = el.checked;
    });
    document.querySelectorAll("select").forEach(el => {
        // 몬스터 타입 설정은 빌드 정보에 포함시키지 않음
        if (el.id !== "target-monster") {
            inputsState[el.id] = el.value;
        }
    });
    
    // 라디오 버튼 그룹 수집
    const radioNames = new Set();
    document.querySelectorAll("input[type='radio']").forEach(el => {
        radioNames.add(el.name);
    });
    radioNames.forEach(name => {
        const checkedRadio = document.querySelector(`input[name='${name}']:checked`);
        inputsState[name] = checkedRadio ? checkedRadio.value : null;
    });
    
    return inputsState;
}

// 입력 폼들의 설정 상태 복원
function restoreBuildInputs(inputsState) {
    if (!inputsState) return;

    // 0단계: 오검 조합 및 조합 점수부터 먼저 복원하여 제한개수(3개/5개) 설정을 마침
    const synSelect = document.getElementById("ogeom-synergy");
    const scoreSelect = document.getElementById("ogeom-synergy-score");
    if (synSelect && inputsState["ogeom-synergy"] !== undefined) {
        synSelect.value = inputsState["ogeom-synergy"];
    }
    if (scoreSelect && inputsState["ogeom-synergy-score"] !== undefined) {
        scoreSelect.value = inputsState["ogeom-synergy-score"];
    }
    updateOgeomSynergyUI(); // UI 및 설명 및 활성 상태 업데이트

    // 1단계: 오검 타입 복원 및 옵션 초기 바인딩
    for (let i = 1; i <= 5; i++) {
        const typeId = `ogeom-${i}-type`;
        if (inputsState[typeId] !== undefined) {
            const el = document.getElementById(typeId);
            if (el) {
                el.value = inputsState[typeId];
                updateOgeomOptions(i); // 타입에 따른 옵션 구성
            }
        }
    }

    // 1.5단계: 오검 옵션 선택값 복원 및 그에 맞는 레벨 스펙(1~20Lv 등) 재바인딩
    for (let i = 1; i <= 5; i++) {
        let optionsChanged = false;
        for (let j = 1; j <= 3; j++) {
            const optId = `ogeom-${i}-opt-${j}`;
            if (inputsState[optId] !== undefined) {
                const el = document.getElementById(optId);
                if (el) {
                    el.value = inputsState[optId];
                    optionsChanged = true;
                }
            }
        }
        if (optionsChanged) {
            updateOgeomOptions(i); // 윈드밀/돌진/스매시 선택에 따른 20레벨 범위 확장 적용
        }
    }

    // 2단계: 나머지 모든 입력값 복원
    Object.keys(inputsState).forEach(id => {
        // 기존 저장된 빌드에 몬스터 설정이 포함되어 있더라도 복원하지 않음
        if (id === "target-monster") return;
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === "INPUT") {
                if (el.type === "checkbox") {
                    el.checked = inputsState[id];
                } else if (el.type === "number") {
                    el.value = inputsState[id];
                }
            } else if (el.tagName === "SELECT") {
                // 이미 위에서 복원한 오검 타입 및 옵션 셀렉트는 건너뜀
                const isOgeomTypeOrOpt = id.startsWith("ogeom-") && (id.endsWith("-type") || id.includes("-opt-"));
                if (!isOgeomTypeOrOpt) {
                    el.value = inputsState[id];
                }
            }
        } else {
            // 라디오 버튼 그룹 복원
            const radios = document.querySelectorAll(`input[name='${id}']`);
            if (radios.length > 0) {
                radios.forEach(radio => {
                    radio.checked = (radio.value === inputsState[id]);
                });
            }
        }
    });
}

// 로컬 스택 제어 전용 액션 함수들
function loadBuild(id) {
    const build = savedBuilds.find(b => b.id === id);
    if (!build) return;
    restoreBuildInputs(build.inputs);
    activeLoadedBuildId = id; // 현재 적용 빌드로 설정
    renderSavedBuildsList(); // 상태 하이라이트 반영을 위해 목록 갱신
    calculate();
}

function setCompareBase(id) {
    activeCompareBuildId = id;
    localStorage.setItem("sacred_guard_active_compare_id", id);
    renderSavedBuildsList();
    calculate();
}

function deleteBuild(id) {
    savedBuilds = savedBuilds.filter(b => b.id !== id);
    localStorage.setItem("sacred_guard_saved_builds", JSON.stringify(savedBuilds));
    
    if (activeCompareBuildId === id) {
        activeCompareBuildId = null;
        localStorage.removeItem("sacred_guard_active_compare_id");
    }
    if (activeLoadedBuildId === id) {
        activeLoadedBuildId = null;
    }
    
    renderSavedBuildsList();
    calculate();
}

// 로컬 스토리지에 있는 빌드 목록 렌더링
function renderSavedBuildsList() {
    const listEl = document.getElementById("saved-builds-list");
    if (!listEl) return;

    listEl.innerHTML = "";

    if (savedBuilds.length === 0) {
        listEl.innerHTML = `<div style="text-align: center; color: var(--text-dark); padding: 1rem; font-size: 0.8rem; font-family: 'Noto Sans KR', sans-serif;">저장된 빌드가 없습니다. 현재 셋팅을 저장해 보세요!</div>`;
        return;
    }

    savedBuilds.forEach(build => {
        const isCompareBase = build.id === activeCompareBuildId;
        const isLoaded = build.id === activeLoadedBuildId;

        const item = document.createElement("div");
        item.className = `build-item ${isCompareBase ? 'compare-base' : ''} ${isLoaded ? 'loaded-build' : ''}`;

        const loadedBadge = isLoaded 
            ? `<span class="badge-loaded" style="background: rgba(0, 229, 255, 0.12); color: #00e5ff; border: 1px solid rgba(0, 229, 255, 0.25); font-size: 0.65rem; padding: 0.05rem 0.3rem; border-radius: 3px; font-weight: bold; margin-left: 0.5rem; font-family: 'Noto Sans KR';">적용됨</span>` 
            : '';

        item.innerHTML = `
            <div class="build-item-info">
                <span class="build-item-title">${build.name}${loadedBadge}</span>
                <span class="build-item-meta">맥댐: ${build.meta.maxDmg.toLocaleString()} | 방어: ${build.meta.finalDef.toLocaleString()} | 생명: ${build.meta.finalHp.toLocaleString()} (${build.meta.timestamp})</span>
            </div>
            <div class="build-item-actions">
                <button class="btn-xs btn-xs-secondary" onclick="loadBuild('${build.id}')">불러오기</button>
                ${isLoaded ? `<button class="btn-xs" style="background: rgba(0, 230, 118, 0.12); color: #00e676; border: 1px solid rgba(0, 230, 118, 0.25); cursor: pointer;" onclick="updateBuild('${build.id}')">덮어쓰기</button>` : ''}
                <button class="btn-xs ${isCompareBase ? 'btn-xs-primary' : 'btn-xs-secondary'}" onclick="setCompareBase('${build.id}')">비교기준</button>
                <button class="btn-xs btn-xs-danger" onclick="deleteBuild('${build.id}')">삭제</button>
            </div>
        `;
        listEl.appendChild(item);
    });
}

// 빌드 덮어쓰기 기능
function updateBuild(id) {
    const build = savedBuilds.find(b => b.id === id);
    if (!build) return;

    if (!confirm(`'${build.name}' 빌드를 현재 화면의 세팅으로 덮어쓰시겠습니까?`)) return;

    const maxDmg = Math.floor(parseFloat(document.getElementById("summary-final-max-dmg").textContent.replace(/,/g, '')) || 0);
    const finalDef = Math.floor(parseFloat(document.getElementById("summary-final-defense").textContent.replace(/,/g, '')) || 0);
    const finalHp = Math.floor(parseFloat(document.getElementById("summary-final-hp").textContent.replace(/,/g, '')) || 0);

    const getVal = (id) => Math.floor(parseFloat(document.getElementById(id).textContent.replace(/,/g, '')) || 0);

    build.meta = {
        maxDmg,
        finalDef,
        finalHp,
        timestamp: new Date().toLocaleString("ko-KR", { hour12: false })
    };
    build.inputs = getBuildInputs();
    build.skills = {
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
    };

    localStorage.setItem("sacred_guard_saved_builds", JSON.stringify(savedBuilds));
    renderSavedBuildsList();
    calculate();
    alert("빌드가 현재 세팅으로 덮어써졌습니다.");
}

// 빌드 목록 클립보드 복사 내보내기 기능
function exportBuilds() {
    if (savedBuilds.length === 0) {
        alert("저장된 빌드가 없습니다.");
        return;
    }
    const jsonStr = JSON.stringify(savedBuilds, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
        alert("저장된 모든 빌드 데이터가 클립보드에 JSON 형식으로 복사되었습니다.\n메모장 등에 붙여넣어 백업하거나 공유할 수 있습니다.");
    }).catch(err => {
        console.error("복사 실패:", err);
        window.prompt("아래 코드를 복사하여 저장하세요:", jsonStr);
    });
}

// 빌드 목록 외부 텍스트에서 불러오기 가져오기 기능
function importBuilds() {
    const jsonStr = window.prompt("내보내기 했던 빌드 JSON 데이터를 아래 입력창에 붙여넣어 주세요.");
    if (!jsonStr) return;

    try {
        const imported = JSON.parse(jsonStr);
        if (!Array.isArray(imported)) {
            throw new Error("올바른 빌드 데이터 형식이 아닙니다. (배열 구조 필요)");
        }

        for (let build of imported) {
            if (!build.id || !build.name || !build.meta || !build.inputs || !build.skills) {
                throw new Error("빌드 데이터의 일부 형식이 누락되었습니다.");
            }
        }

        if (confirm(`기존에 저장된 빌드 ${savedBuilds.length}개 외에 추가로 ${imported.length}개의 빌드를 가져오시겠습니까?`)) {
            imported.forEach(build => {
                const exists = savedBuilds.some(b => b.id === build.id);
                if (exists) {
                    build.id = 'build_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                }
                savedBuilds.push(build);
            });

            localStorage.setItem("sacred_guard_saved_builds", JSON.stringify(savedBuilds));
            renderSavedBuildsList();
            calculate();
            alert(`성공적으로 ${imported.length}개의 빌드를 추가로 가져왔습니다.`);
        }
    } catch (e) {
        alert(`빌드 가져오기에 실패했습니다:\n${e.message}`);
    }
}

// 전역 스코프에 노출하여 onclick 호출 가능하게 바인딩
window.loadBuild = loadBuild;
window.setCompareBase = setCompareBase;
window.deleteBuild = deleteBuild;
window.updateBuild = updateBuild;
window.exportBuilds = exportBuilds;
window.importBuilds = importBuilds;

// 아르카나 및 재능 스킬 카드 클릭 시 카드 자체를 아래로 확장하여 상세 데미지 공식 분해 노출
function setupSkillCardBreakdownToggles() {
    document.querySelectorAll(".skill-result-card").forEach(card => {
        card.addEventListener("click", () => {
            const skill = card.getAttribute("data-skill");
            if (!skill) return;

            const breakdown = card.querySelector(".card-breakdown");
            if (!breakdown) return;

            const isExpanded = card.classList.contains("expanded");

            // 1. 다른 모든 카드의 확장상태 초기화 (아코디언 연출)
            document.querySelectorAll(".skill-result-card").forEach(otherCard => {
                if (otherCard !== card) {
                    otherCard.classList.remove("expanded");
                    const otherBreakdown = otherCard.querySelector(".card-breakdown");
                    if (otherBreakdown) {
                        otherBreakdown.classList.add("hidden");
                    }
                }
            });

            // 2. 현재 카드 토글 수행
            if (isExpanded) {
                card.classList.remove("expanded");
                breakdown.classList.add("hidden");
            } else {
                card.classList.add("expanded");
                breakdown.classList.remove("hidden");

                // 확장 완료 후 해당 카드가 화면 안에 완전히 보이도록 스크롤 정렬
                setTimeout(() => {
                    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }, 100);
            }
        });
    });
}

// 입력 카드 접기/펼치기 설정 함수
function setupInputCardCollapse() {
    const collapsedStates = JSON.parse(localStorage.getItem("sacred_guard_collapsed_input_cards") || "{}");

    document.querySelectorAll(".input-card").forEach(card => {
        const id = card.id;
        if (!id) return;

        const header = card.querySelector(".card-header");
        if (!header) return;

        // 로컬 스토리지에 저장된 접힘 상태 적용
        if (collapsedStates[id] === true) {
            card.classList.add("collapsed");
        }

        // 헤더에 접기/펼치기 지시 화살표 추가
        const arrow = document.createElement("span");
        arrow.className = "collapse-arrow";
        arrow.innerHTML = "&#9660;"; // ▼ (다운 화살표)
        header.appendChild(arrow);

        header.addEventListener("click", () => {
            card.classList.toggle("collapsed");
            
            // 상태 업데이트 및 로컬 스토리지 저장
            const isCollapsed = card.classList.contains("collapsed");
            const currentStates = JSON.parse(localStorage.getItem("sacred_guard_collapsed_input_cards") || "{}");
            currentStates[id] = isCollapsed;
            localStorage.setItem("sacred_guard_collapsed_input_cards", JSON.stringify(currentStates));
        });
    });
}
