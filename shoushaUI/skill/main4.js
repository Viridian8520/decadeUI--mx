app.import(function (lib, game, ui, get, ai, _status, app) {
	var plugin = {
		name: "skill",
		filter() {
			return !["chess", "tafang"].includes(get.mode());
		},
		content(next) {},
		precontent() {
			// 添加小黄点样式
			if (!document.getElementById("skill-yellow-dot-style")) {
				var style = document.createElement("style");
				style.id = "skill-yellow-dot-style";
				style.innerHTML = ".skill-yellow-dot{position:absolute;left:2px;top:2px;width:12px;height:12px;z-index:2;display:flex;align-items:center;justify-content:center;color:#FFD700;font-weight:bold;font-size:10px;background:none;border-radius:0;}";
				document.head.appendChild(style);
			}
			Object.assign(ui.create, {
				skills(skills) {
					ui.skills = plugin.createSkills(skills, ui.skills);
					ui.skillControl.update();
					return ui.skills;
				},
				skills2(skills) {
					ui.skills2 = plugin.createSkills(skills, ui.skills2);
					ui.skillControl.update();
					return ui.skills2;
				},
				skills3(skills) {
					ui.skills3 = plugin.createSkills(skills, ui.skills3);
					ui.skillControl.update();
					return ui.skills3;
				},
				skillControl(clear) {
					if (!ui.skillControl) {
						var node = ui.create.div(".skill-control", ui.arena);
						node.node = {
							enable: ui.create.div(".enable", node),
							trigger: ui.create.div(".trigger", node),
						};
						for (var i in plugin.controlElement) {
							node[i] = plugin.controlElement[i];
						}
						ui.skillControl = node;
					}
					if (clear) {
						ui.skillControl.node.enable.innerHTML = "";
						ui.skillControl.node.trigger.innerHTML = "";
					}
					return ui.skillControl;
				},
			});
			Object.assign(ui, {
				updateSkillControl(player, clear) {
					var eSkills = player.getSkills("e", true, false).slice(0);
					var skills = player.getSkills("invisible", null, false); /*国战隐匿技能*/
					var gSkills;
					if (ui.skills2 && ui.skills2.skills.length) {
						gSkills = ui.skills2.skills;
					}

					for (var i = 0; i < skills.length; i++) {
						var info = get.info(skills[i]);
						if (info && info.nopop && !skills[i].startsWith("olhedao_tianshu_")) skills.splice(i--, 1);
					}

					var iSkills = player.invisibleSkills.slice(0);
					game.expandSkills(iSkills);
					skills.addArray(
						iSkills.filter(function (skill) {
							var info = get.info(skill);
							return info && info.enable;
						})
					);

					if (player === game.me) {
						var skillControl = ui.create.skillControl(clear);
						skillControl.add(skills, eSkills);
						if (gSkills) skillControl.add(gSkills);
						skillControl.update();
						game.addVideo("updateSkillControl", player, clear);
					}

					var juexingji = {};
					var xiandingji = {};
					player.getSkills("invisible", null, false).forEach(function (skill) {
						var info = get.info(skill);
						if (!info) return;
						if (get.is.zhuanhuanji(skill, player) || info.limited || (info.intro && info.intro.content === "limited")) {
							xiandingji[skill] = player.awakenedSkills.includes(skill);
						}
						if (info.juexingji || info.dutySkill) juexingji[skill] = player.awakenedSkills.includes(skill);
					});
					plugin.updateSkillMarks(player, xiandingji, juexingji);
				},
			});

			app.reWriteFunction(lib.element.player, {
				addSkill: [
					null,
					function () {
						ui.updateSkillControl(this);
					},
				],
				removeSkill: [
					null,
					function () {
						ui.updateSkillControl(this, true);
					},
				],
				addSkillTrigger: [
					null,
					function () {
						ui.updateSkillControl(this);
					},
				],
				removeSkillTrigger: [
					null,
					function () {
						ui.updateSkillControl(this, true);
					},
				],
				awakenSkill: [
					null,
					function () {
						ui.updateSkillControl(this);
					},
				],
				restoreSkill: [
					null,
					function () {
						ui.updateSkillControl(this);
					},
				],
			});
			app.reWriteFunction(lib.element.control, {
				close: [
					null,
					function () {
						if (this.classList.contains("skillControl")) {
							ui.skillControl.update();
						}
					},
				],
			});

			app.reWriteFunction(game, {
				loop: [
					function () {
						if (game.boss && !ui.skillControl) {
							ui.updateSkillControl(game.me);
						}
						if (ui.skillControl) {
							ui.skillControl.update();
						}
					},
					null,
				],
				swapControl: [
					null,
					function () {
						ui.updateSkillControl(game.me, true);
					},
				],
				swapPlayer: [
					null,
					function () {
						ui.updateSkillControl(game.me, true);
					},
				],
			});

			Object.assign(game.videoContent, {
				updateSkillControl(player, clear) {
					ui.updateSkillControl(player, clear);
				},
			});
			ui.skillControlArea = ui.create.div();
		},
		controlElement: {
			add(skill, eSkills) {
				if (Array.isArray(skill)) {
					var node = this;
					skill.forEach(function (item) {
						node.add(item, eSkills);
					});
					return this;
				}

				var self = this;
				// 国战模式下，获取所有原生技能
				let nativeSkills = [];
				if (game.me) {
					if (get.mode() == "guozhan") {
						// 国战模式下，获取所有原生技能
						nativeSkills = game.me.getSkills("invisible", null, false);
					} else {
						let info1 = game.me.name && lib.character[game.me.name];
						let info2 = game.me.name2 && lib.character[game.me.name2];
						if (info1 && Array.isArray(info1[3])) nativeSkills = nativeSkills.concat(info1[3]);
						if (info2 && Array.isArray(info2[3])) nativeSkills = nativeSkills.concat(info2[3]);
					}
				}
				var skills = game.expandSkills([skill]).map(function (item) {
					return app.get.skillInfo(item);
				});
				var hasSame = false;
				var enableSkills = skills.filter(function (item) {
					if (item.type !== "enable") return false;
					if (item.name === skills[0].name) hasSame = true;
					return true;
				});

				if (!hasSame) enableSkills.unshift(skills[0]);
				var showSkills = enableSkills.length ? enableSkills : skills;
				showSkills.forEach(function (item) {
					var node = self.querySelector('[data-id="' + item.id + '"]');
					if (node) return;
					let skillName = get.translation(item.name);
					let finalName = skillName.slice(0, 2);

					if (lib.skill[item.id] && lib.skill[item.id].zhuanhuanji) {
						let imgType = "yang";
						let player = game.me;
						let markNode = player && player.node && player.node.xSkillMarks && player.node.xSkillMarks.querySelector('.skillMarkItem.zhuanhuanji[data-id="' + item.id + '"]');
						if (markNode && markNode.classList.contains("yin")) {
							imgType = "ying";
						}
						let imgPath = "extension/十周年UI/shoushaUI/skill/online/mark_" + imgType + "OL.png";
						finalName = '<img src="' + imgPath + '" style="vertical-align:middle;height:22px;margin-right:2px;">' + skillName;
					}

					if (item.type === "enable") {
						node = ui.create.div(lib.skill[item.id].limited ? ".xiandingji" : ".skillitem", self.node.enable);
						node.innerHTML = finalName;
						node.dataset.id = item.id;
						// 不是当前武将原生技能才加小黄点
						if (lib.skill[item.id] && nativeSkills.indexOf(item.id) === -1 && node) {
							var dot = document.createElement("span");
							dot.className = "skill-yellow-dot";
							dot.textContent = "+";
							node.style.position = "relative";
							node.appendChild(dot);
						}
						node.addEventListener("click", function () {
							game.playAudio("..", "extension", "十周年UI", "audio/SkillBtn");
						});
						app.listen(node, plugin.clickSkill);
						return;
					}
					if (!item.info) return;
					if (!item.translation) return;
					if (eSkills && eSkills.includes(item.id)) return;
					node = ui.create.div(".skillitem", self.node[lib.config.phonelayout ? "trigger" : "enable"], finalName);
					node.dataset.id = item.id;
					// 不是当前武将原生技能才加小黄点（这里也要用nativeSkills判断！）
					if (lib.skill[item.id] && nativeSkills.indexOf(item.id) === -1 && node) {
						var dot = document.createElement("span");
						dot.className = "skill-yellow-dot";
						dot.textContent = "+";
						node.style.position = "relative";
						node.appendChild(dot);
					}
				});
				return this;
			},
			update() {
				var skills = [];
				if (ui.skills) skills.addArray(ui.skills.skills);
				if (ui.skills2) skills.addArray(ui.skills2.skills);
				if (ui.skills3) skills.addArray(ui.skills3.skills);

				Array.from(this.node.enable.childNodes).forEach(function (item) {
					if (skills.includes(item.dataset.id)) {
						item.classList.add("usable");
					} else {
						item.classList.remove("usable");
					}

					if (_status.event.skill === item.dataset.id) {
						item.classList.add("select");
					} else {
						item.classList.remove("select");
					}
				});

				var level1 = Math.min(4, this.node.trigger.childNodes.length);
				var level2 = this.node.enable.childNodes.length > 2 ? 4 : this.node.enable.childNodes.length > 0 ? 2 : 0;
				var level = Math.max(level1, level2);
				ui.arena.dataset.sclevel = level;
			},
		},
		checkSkill(skill) {
			var info = lib.skill[skill];
			if (!info) return -1;
			if (info.enable) return 1;
			return 0;
		},
		clickSkill(e) {
			if (this.classList.contains("usable")) {
				var skill = this.dataset.id;
				var item = ui.skillControlArea.querySelector('[data-id="' + skill + '"]');
				item && app.mockTouch(item);
			}
		},
		createSkills(skills, node) {
			var same = true;
			if (node) {
				if (skills && skills.length) {
					for (var i = 0; i < node.skills.length; i++) {
						if (node.skills[i] !== skills[i]) {
							same = false;
							break;
						}
					}
				}
				if (same) return node;
				node.close();
				node.delete();
			}
			if (!skills && !skills.length) return;

			node = ui.create.div(".control.skillControl", ui.skillControlArea);
			Object.assign(node, lib.element.control);
			skills.forEach(function (skill) {
				var item = ui.create.div(node);
				item.link = skill;
				item.dataset.id = skill;
				item.addEventListener(lib.config.touchscreen ? "touchend" : "click", ui.click.control);
			});
			node.skills = skills;
			node.custom = ui.click.skill;
			return node;
		},
		updateSkillMarks(player, skills1, skills2) {
			var node = player.node.xSkillMarks;
			if (!node) {
				node = player.node.xSkillMarks = ui.create.div(".skillMarks", player);
			}

			Array.from(node.childNodes).forEach(function (item) {
				if (skills1.hasOwnProperty(item.dataset.id)) return;
				if (skills2[item.dataset.id]) return;
				item.remove();
			});
			//使限定技和转换技显示不同的样式
			for (var k in skills1) {
				var info = lib.skill[k];
				var item = node.querySelector('[data-id="' + k + '"]');
				if (!item) {
					if (!info.zhuanhuanji) {
						item = ui.create.div(".skillMarkItem.xiandingji", node, get.translation(k).charAt(0));
					} else item = ui.create.div(".skillMarkItem.zhuanhuanji", node, "");
					//如果不是转换技就调用限定技的标记
				}
				if (skills1[k]) item.classList.add("used");
				else item.classList.remove("used");
				item.dataset.id = k;
			}
			//这里结束3}
			Array.from(node.querySelectorAll(".juexingji")).forEach(function (item) {
				if (!skills2[item.dataset.id]) {
					item.remove();
				}
			});
			//使觉醒技和使命技不同
			for (var k in skills2) {
				if (!skills2[k]) continue;
				var info = lib.skill[k];
				if (node.querySelector('[data-id="' + k + '"]')) continue;
				var item;
				if (info.dutySkill) {
					item = ui.create.div(".skillMarkItem.duty", node, get.translation(k).charAt(0));
				} else {
					item = ui.create.div(".skillMarkItem.juexingji", node, get.translation(k).charAt(0));
				}
				item.dataset.id = k;
			}
		},
		recontent() {
			app.reWriteFunction(ui.create, {
				dialog: [
					null,
					function (dialog) {
						dialog.classList.add("xdialog");
						app.reWriteFunction(dialog, {
							hide: [
								null,
								function () {
									app.emit("dialog:change", dialog);
								},
							],
						});
					},
				],
			});

			app.reWriteFunction(lib.element.dialog, {
				open: [
					null,
					function () {
						app.emit("dialog:change", this);
					},
				],
				close: [
					null,
					function () {
						app.emit("dialog:change", this);
					},
				],
			});

			app.reWriteFunction(lib.element.player, {
				markSkill: [
					function (args, name) {
						var info = lib.skill[name];
						if (!info) return;
						if (info.limited) return this;
						if (info.intro && info.intro.content === "limited") return this;
					},
				],
			});

			app.reWriteFunction(lib.configMenu.appearence.config, {
				update: [
					null,
					function (res, config, map) {
						map.button_press.hide();
					},
				],
			});

			app.on("playerUpdateE", function (player) {
				plugin.updateMark(player);
			});
		},
		element: {
			mark: {
				delete() {
					this.remove();
				},
				setName(name) {
					name = get.translation(name) || name;
					if (!name || !name.trim()) {
						this.classList.add("unshow");
						this.node.name.innerHTML = "";
					} else {
						this.classList.remove("unshow");
						this.node.name.innerHTML = get.translation(name) || name;
					}
					return this;
				},
				setCount(count) {
					if (typeof count === "number") {
						this.node.count.innerHTML = count;
						this.node.count.classList.remove("unshow");
					} else {
						this.node.count.innerHTML = "";
						this.node.count.classList.add("unshow");
					}
					return this;
				},
				setExtra(extra) {
					var str = "";

					if (!Array.isArray(extra)) extra = [extra];
					extra.forEach(function (item) {
						if (!item || typeof item !== "string") return this;
						if (item.indexOf("#") === 0) {
							item = item.substr(1);
							str += "<br>";
						}
						str += "<div>" + item + "</div>";
					});

					if (str) {
						this.node.extra.classList.remove("unshow");
						this.node.extra.innerHTML = str;
					} else if (!this._characterMark) {
						this.node.extra.innerHTML = "";
						this.node.extra.classList.add("unshow");
					}
					return this;
				},
				setBackground(name, type) {
					var skill = lib.skill[this.name];
					if (skill && skill.intro && skill.intro.markExtra) return this;
					if (type === "character") {
						name = get.translation(name) || name;
						this._characterMark = true;
						return this.setExtra(name);
					}
					return this;
				},
				_customintro(uiintro) {
					var node = this;
					var info = node.info;
					var player = node.parentNode.parentNode;
					if (info.name) {
						if (typeof info.name == "function") {
							var named = info.name(player.storage[node.skill], player);
							if (named) {
								uiintro.add(named);
							}
						} else {
							uiintro.add(info.name);
						}
					} else if (info.name !== false) {
						uiintro.add(get.translation(node.skill));
					}

					if (typeof info.mark == "function") {
						var stint = info.mark(uiintro, player.storage[node.skill], player);
						if (stint) {
							var placetext = uiintro.add('<div class="text" style="display:inline">' + stint + "</div>");
							if (stint.indexOf('<div class="skill"') != 0) {
								uiintro._place_text = placetext;
							}
						}
					} else {
						var stint = get.storageintro(info.content, player.storage[node.skill], player, uiintro, node.skill);
						if (stint) {
							if (stint[0] == "@") {
								uiintro.add('<div class="caption">' + stint.slice(1) + "</div>");
							} else {
								var placetext = uiintro.add('<div class="text" style="display:inline">' + stint + "</div>");
								if (stint.indexOf('<div class="skill"') != 0) {
									uiintro._place_text = placetext;
								}
							}
						}
					}
					uiintro.add(ui.create.div(".placeholder.slim"));
				},
			},
		},
		click: {
			mark(e) {
				e.stopPropagation();
				delete this._waitingfordrag;
				if (_status.dragged) return;
				if (_status.clicked) return;
				if (ui.intro) return;
				var rect = this.getBoundingClientRect();
				ui.click.touchpop();
				ui.click.intro.call(this, {
					clientX: rect.left + 18,
					clientY: rect.top + 12,
				});
				_status.clicked = false;
			},
		},
		updateMark(player) {
			var eh = player.node.equips.childNodes.length * 22;
			var bv = Math.max(88, eh) * 0.8 + 1.6;
			player.node.marks.style.bottom = bv + "px";
		},
	};
	return plugin;
});
