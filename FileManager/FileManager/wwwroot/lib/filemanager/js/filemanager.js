// Bổ sung prototype cho kiểu Date
Date.prototype.toDMTHMS = function () {
    let dateFormat = this.getDate() + "/" + (this.getMonth() + 1) + "/" + this.getFullYear();
    let timeFormat = this.getHours() + ":" + this.getMinutes() + ":" + this.getSeconds();

    return `${dateFormat} ${timeFormat}`;
}

document.addEventListener("alpine:init", () => {
    Alpine.data("filedata", () => ({
        _setting: {
            baseUrl: '/filemanager',
            ajaxParam: {
                cmd: '',
                value: '',
                secondaryValue: '',
            },

            setParams(cmd, value = '', secondaryValue = '') {
                this.ajaxParam.cmd = cmd;
                this.ajaxParam.value = value;
                this.ajaxParam.secondaryValue = secondaryValue;
            },

            getUrl() {
                return `${this.baseUrl}?${new URLSearchParams(this.ajaxParam)}`;
            }
        },

        _folderTree: [
            {
                fullPath: '',
                level: 1,
                folderName: '',
                isOpen: true,
                cssClass: {}
            }
        ],

        _folderTreeSelectedIndex: -1,
        _panelData: [
            {
                path: '',
                name: '',
                isFolder: false
            }
        ],

        _panelItemSelectedIndex: -1,
        _additionalInfo: [
            selectedText = '',
        ],

        _folderUpdinPopup: {
            show: false,
            lable: 'Tên thư mục',
            value: '',
            isRenameMode: false,
        },

        // Rename Data
        _panelRenameSelectedData: {
            folderName: '',
            oldFolderName: '',
            newFolderName: '',
        },

        init() {
            this._setting.setParams("GET_ALL_DIR");
            fetch(this._setting.getUrl())
                .then(res => res.json())
                .then(json => {
                    this._folderTree = json.data.map(path => {
                        // Tách chuỗi thành mảng, dựa theo dấu \
                        var tmpArr = path.split("\\");
                        return {
                            folderName: tmpArr[tmpArr.length - 1],
                            fullPath: path,
                            level: tmpArr.length,
                            isOpen: false,
                            cssClass: {
                                [`folder-level-${tmpArr.length}`]: true,
                                show: false,
                                clickFile: false
                            }
                        }
                    });
                })
                .catch(err => {
                    console.log(err);
                })
        },

        toggleFolder(idx) {
            // Hiển thị những thư mục có level lớn hơn level hiện tại 1 đơn vị

            if (idx >= this._folderTree.length) {
                return;
            }
            this._folderTree[idx].isOpen = !this._folderTree[idx].isOpen;
            var currentLevel = this._folderTree[idx].level;

            //Đệ quy
            this.openFolder(idx, currentLevel);
        },

        openFolder(idx, maxLevel) {
            var isOpen = this._folderTree[idx].isOpen;

            if (isOpen) {
                while (idx + 1 < this._folderTree.length && this._folderTree[idx + 1].level > maxLevel) {
                    if (this._folderTree[idx + 1].level == maxLevel + 1) {
                        this._folderTree[idx + 1].cssClass.show = isOpen;
                        if (this._folderTree[idx + 1].isOpen) {
                            this.openFolder(idx + 1, this._folderTree[idx + 1].level);
                        }
                    }
                    idx++;
                }
            } else {
                while (idx + 1 < this._folderTree.length && this._folderTree[idx + 1].level > maxLevel) {
                    this._folderTree[idx + 1].cssClass.show = isOpen;
                    idx++;
                }
            }
        },

        getAllInDir(fullPath, idx) {
            this._panelItemSelectedIndex = -1;
            this._folderTreeSelectedIndex = idx;
            this._setting.setParams("GET_ALL_IN_DIR", fullPath);
            fetch(this._setting.getUrl())
                .then(res => res.json())
                .then(json => {
                    if (json.success) {
                        this._panelData = json.data;
                    }
                })
                .catch(err => {
                    console.log(err);
                })
        },

        getIcon(isFolder) {
            let icon = 'file-invoice-solid.svg';
            if (isFolder) {
                icon = 'folder-solid.svg';
            }
            return '/lib/filemanager/icon/' + icon;
        },

        setSelectedItem(f, idx) {
            this._panelItemSelectedIndex = idx;
            this._additionalInfo.selectedText = this._panelData[idx].name;
        },

        deletedSelectedItem() {
            let idx = this._panelItemSelectedIndex;
            if (idx < 0 || !this._panelData[idx]) {
                alert("Chưa chọn file hoặc thư mục");
            }

            this._setting.setParams("DELETE_ITEM", this._panelData[idx].path);
            fetch(this._setting.getUrl())
                .then(res => res.json())
                .then(json => {
                    if (json.success) {
                        let isFolder = this._panelData[idx].isFolder;
                        let fullPath = this._panelData[idx].path;
                        // Xóa item được chọn khỏi panelData
                        this._panelData.splice(idx, 1);

                        // Xóa khỏi cây thư mục nếu là folder
                        if (isFolder) {
                            // Tìm lại index trên cây thư mục
                            let starstIdx = this._folderTree.findIndex(item => item.fullPath == fullPath);
                            idx = starstIdx;
                            if (idx >= 0) {
                                let level = this._folderTree[idx].level;
                                let cntDel = 1;
                                while (idx + 1 < this._folderTree.length && this._folderTree[idx + 1].level > level) {
                                    cntDel++;
                                    idx++;
                                }

                                this._folderTree.splice(starstIdx, cntDel);
                            }
                        }
                        this._folderTreeSelectedIndex = -1;
                        this._panelItemSelectedIndex = -1;
                    }
                });
        },

        openFolderUpdinPopup() {
            // Hiển thị popup và đặt giá trị mặc định
            this._folderUpdinPopup.show = true;
            this._folderUpdinPopup.value = 'NewFolder';
            this._folderUpdinPopup.lable = 'Thêm thư mục';
            this._folderUpdinPopup.isRenameMode = false;
        },

        closeFolderUpdinPopup() {
            this._folderUpdinPopup.show = false;
        },

        updinFolder() {
            if (this._folderUpdinPopup.isRenameMode) {

                let i = this._panelItemSelectedIndex;
                let newName = this._folderUpdinPopup.value;
                if (!newName) {
                    alert("Không được để trống!");
                    return;
                }

                // Mode Rename
                let idxTree = this._folderTreeSelectedIndex;
                let oldPath = this._panelData[i].path;
                newName = this._folderTree[idxTree].fullPath + '\\' + newName;

                this._setting.setParams("RENAME", oldPath, newName);
                fetch(this._setting.getUrl())
                    .then(res => res.json())
                    .then(json => {
                        if (json.success) {
                            // Thêm vào panel - ko cần reload
                            var panelItem = {
                                path: newName,
                                name: this._folderUpdinPopup.value,
                                isFolder: true
                            };
                            this._panelData.splice(i, 1, panelItem);

                            //// Thêm vào cây thư mục - ko cần reload
                            //var folderTreeItem = {
                            //    fullPath: newName,
                            //    level: this._folderTree[idxTree].level + 1,
                            //    folderName: this._folderUpdinPopup.value,
                            //    isOpen: false,
                            //    cssClass: {
                            //        [`folder-level-${this._folderTree[idxTree].level + 1}`]: true,
                            //        show: this._folderTree[idxTree].isOpen,
                            //    },
                            //};
                            //this._folderTree.splice(idxTree + 1, 1, folderTreeItem);

                            // Gọi hàm đóng popup sau khi hoàn thành thêm thư mục
                            this.closeFolderUpdinPopup();
                        } else {
                            alert(json.message);
                        }
                    })

            } else {
                // Mode create

                let i = this._folderTreeSelectedIndex;
                let newFolderName = this._folderUpdinPopup.value;
                let newFolderPath;

                if (!newFolderName) {
                    alert("Chưa nhập tên thư mục");
                    return;
                }

                if (i == -1) {
                    newFolderPath = newFolderName;
                    // Gọi hàm đóng popup sau khi hoàn thành thêm thư mục
                    this.closeFolderUpdinPopup();
                } else {
                    newFolderPath = this._folderTree[i].fullPath + "\\" + newFolderName;
                }
                this._setting.setParams("ADD_NEW_ITEM", newFolderPath);
                fetch(this._setting.getUrl())
                    .then(res => res.json())
                    .then(json => {
                        if (json.success) {
                            // Thêm vào panel - ko cần reload
                            var panelItem = {
                                path: newFolderPath,
                                name: newFolderName,
                                isFolder: true
                            };
                            this._panelData.unshift(panelItem);

                            // Thêm vào cây thư mục - ko cần reload
                            var folderTreeItem = {
                                fullPath: newFolderPath,
                                level: this._folderTree[i].level + 1,
                                folderName: newFolderName,
                                isOpen: false,
                                cssClass: {
                                    [`folder-level-${this._folderTree[i].level + 1}`]: true,
                                    show: this._folderTree[i].isOpen,
                                },
                            };
                            this._folderTree.splice(i + 1, 0, folderTreeItem);

                            // Gọi hàm đóng popup sau khi hoàn thành thêm thư mục
                            this.closeFolderUpdinPopup();
                        } else {
                            alert(json.message);
                        }
                    })
            }

        },

        uploadFile() {
            let fileUploadEle = this.$el.parentElement.querySelector("input[fm-file-upload]");

            if (!fileUploadEle.files.length) {
                alert("Chưa chọn file!!!");
                return;
            }

            let file = fileUploadEle.files[0];
            let data = new FormData();
            data.append("FILE_UPLOAD", file, file.name);

            let i = this._folderTreeSelectedIndex;
            this._setting.setParams("UPLOAD", this._folderTree[i].fullPath);
            fetch(this._setting.getUrl(), {
                method: 'POST',
                body: data
            })
                .then(res => location.reload());
        },

        renameSelectedItem() {
            let i = this._panelItemSelectedIndex;

            if (i < 0 || !this._panelData[i]) {
                alert("Chưa chọn file hoặc thư mục");
                return;
            }
            this._folderUpdinPopup.show = true;
            this._folderUpdinPopup.value = this._additionalInfo.selectedText;
            this._panelRenameSelectedData.folderName = this._panelData[i].path;
            this._panelRenameSelectedData.oldFolderName = this._panelData[i].name;

            if (this._panelData[i].isFolder) {
                this._folderUpdinPopup.lable = 'Tên thư mục';
            } else {
                this._folderUpdinPopup.lable = 'Tên file';
            }

            this._folderUpdinPopup.isRenameMode = true;
        }
    }))
});