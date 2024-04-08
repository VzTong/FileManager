using FileManager.Common;
using Microsoft.AspNetCore.Mvc;

namespace FileManager.Controllers
{
	// Định nghĩa controller trả về API chứ ko trả về View <=> Attribute
	[ApiController]
	[Route("filemanager")]
	public class FilerManagerController : Controller
	{
		File_Manager _fm;
        public IActionResult ExecuteCmd([FromServices] IWebHostEnvironment env)
        {
			// Lấy đường dẫn thư mục upload
			var wwwroot = env.WebRootPath;

			// Nối chuỗi để có đường dẫn thư mục upload
			var uploadPath = Path.Combine(wwwroot, "upload");
            _fm = new File_Manager(uploadPath, Request);
			return Ok(_fm.ExecuteCmd());
		}
	}
}
