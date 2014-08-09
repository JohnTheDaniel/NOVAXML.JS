<?PHP
header('Content-type: application/pdf');
header('Access-Control-Allow-Headers: Range');
header('Access-Control-Expose-Headers: Accept-Ranges, Content-Encoding, Content-Length, Content-Range');
header('Content-Disposition: attachment;filename="Schedule.pdf"');
header('Access-Control-Allow-Origin: *');

$id = "n1a";
$period = "Vt";
$week = 7;
$school = 52550;

if ($_GET['id'])
	{
	$id = $_GET['id'];
	}
if ($_GET['period'])
	{
	$period = $_GET['period'];
	}
if ($_GET['week'])
	{
	$week = $_GET['week'];
	}
if ($_GET['school'])
	{
	$school = $_GET['school'];
	}

$file="http://www.novasoftware.se/ImgGen/schedulegenerator.aspx?format=pdf&schoolid=".$school."/sv-se&id=".$id."&period=".$period."&week=".$week."&mode=0&head=1&day=0&width=1&height=1";
readfile($file);
?>