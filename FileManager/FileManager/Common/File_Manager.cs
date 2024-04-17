using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Xml.Serialization;

namespace FileManager.Common
{
	public class File_Manager
	{
		protected string _rootPath;
		protected string _command;
		protected string _value;

		// Dùng trong trường hợp đổi tên/di chuyển file
		protected string _secondaryValue;
		protected IFormFile? _file;

		public File_Manager(string rootPath, HttpRequest request)
		{
			_rootPath = rootPath;
			_command = request.Query["cmd"].ToString();
			_value = request.Query["value"].ToString();
			_secondaryValue = request.Query["secondaryValue"].ToString();
			if (request.Method.ToUpper() == "POST")
			{
				_file = request.Form.Files["FILE_UPLOAD"];
			}
		}

		public FMResponse ExecuteCmd()
		{
			FMResponse response = new();
			try
			{
				switch (_command)
				{
					case "GET_ALL_DIR":
						{
							response.Data = GetAllDirs();
							break;
						}
					case "GET_ALL_IN_DIR":
						{
							response.Data = GetAllInDirs(_value);
							break;
						}

					case "DELETE_ITEM":
						{
							DeletedItem(_value);
							break;
						}

					case "ADD_NEW_ITEM":
						{
							AddNewFolder(_value);
							break;
						}

					case "UPLOAD":
						{
							UploadFile(_value);
							break;
						}

					case "RENAME":
						{
							Rename(_value, _secondaryValue);
							break;
						}
					default:
						{
							break;
						}
				}
			}
			catch (Exception ex)
			{
				response.Success = false;
				response.Message = ex.Message;
				response.Data = null;

			}
			return response;
		}

		protected List<string> GetAllDirs()
		{
			var dirs = Directory.GetDirectories(_rootPath, "*", SearchOption.AllDirectories).ToList();
			for (int i = 0; i < dirs.Count; i++)
			{
				dirs[i] = dirs[i].Replace(_rootPath, string.Empty).Trim(Path.DirectorySeparatorChar); // Ký tự phân cách thư mục 'Lấy dấu đường dẫn tùy vào HĐH'
			}

			// Sắp xếp bằng hàm sort tự định nghĩa, ưu tiên ký tự "\"
			dirs.Sort((string a, string b) =>
			{
				for (int i = 0; i < a.Length; i++)
				{
					if (i >= b.Length) return 1;
					if (a[i] != b[i])
					{
						if (a[i] == '\\') return -1;
						if (b[i] == '\\') return 1;
						return a[i] - b[i];
					}
				}
				return a.Length - b.Length;
			});
			return dirs;
		}
		protected List<FMFolderItem> GetAllInDirs(string folder)
		{
			var result = new List<FMFolderItem>();
			var fullPath = Path.Combine(_rootPath, folder);

			var dirs = Directory.GetDirectories(fullPath)
						.Select(d => new FMFolderItem
						{
							Path = d.Replace(_rootPath + "\\", ""),
							Name = Path.GetFileName(d),
							IsFolder = true
						});

			var files = Directory.GetFiles(fullPath)
						.Select(f => new FMFolderItem
						{
							Path = f.Replace(_rootPath + "\\", ""),
							Name = Path.GetFileName(f),
							IsFolder = false
						});

			result.AddRange(dirs);
			result.AddRange(files);

			return result;
		}
		protected void DeletedItem(string path)
		{
			path = Path.Combine(_rootPath, path);
			if (File.Exists(path))
			{
				File.Delete(path);
			}
			else if (Directory.Exists(path))
			{
				Directory.Delete(path, true);
			}
		}

		protected void AddNewFolder(string name)
		{
			name = Path.Combine(_rootPath, name);
			if (!Directory.Exists(name))
			{
				Directory.CreateDirectory(name);
			}
			else
			{
				throw new Exception("Tên thư mục đã tồn tại");
			}
		}

		protected void UploadFile(string folder)
		{
			if (_file is null)
			{
				throw new Exception("Không có file!!!");
			}

			// Tạo file mới, gắn thêm thời gian để không bị trừng
			var filename = Path.GetFileNameWithoutExtension(_file.FileName)
						+ DateTime.Now.Ticks
						+ Path.GetExtension(_file.FileName);

			var path = Path.Combine(_rootPath, folder, filename);
			var stream = new FileStream(path, FileMode.CreateNew);
			_file.CopyTo(stream);
		}

		protected void Rename(string oldName, string NewName)
		{
			oldName = Path.Combine(_rootPath, oldName);
			NewName = Path.Combine(_rootPath, NewName);

			//Check thư mục có tồn tại hay ko
			if (Directory.Exists(oldName))
			{
				// Check xem thư mục mới có tồn tại hay ko, nếu có thì đổi cũ => mới
				if (!Directory.Exists(NewName))
				{
					Directory.Move(oldName, NewName);
				}
				else
				{
					throw new Exception($"Tên thư mục đã tồn tại");
				}
			}

			//Check file có tồn tại hay ko
			else if (File.Exists(oldName))
			{
				// Check xem file mới có tồn tại hay ko, nếu có thì đổi cũ => mới
				if (!File.Exists(NewName))
				{
					File.Move(oldName, NewName);
				}
				else
				{
					throw new Exception($"Tên thư mục đã tồn tại");
				}
			}
			else
			{
				throw new Exception($"Đương dẫn không hợp lệ!");
			}

		}

	}

	public class FMResponse
	{
		public bool Success { get; set; } = true;
		public string? Message { get; set; }
		public object? Data { get; set; }
	}

	public class FMFolderItem
	{
		public string Path { get; set; }
		public string Name { get; set; }
		public bool IsFolder { get; set; }
	}
}
